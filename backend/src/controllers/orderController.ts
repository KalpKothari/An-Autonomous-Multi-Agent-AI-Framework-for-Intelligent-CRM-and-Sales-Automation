
import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Lead from "../models/Lead";
import Product from "../models/Product";
import Inventory from "../models/Inventory";
import Invoice from "../models/Invoice";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    leadId,
    quantity,
    purchaseConfirmed,
    purchaseConfirmationId,
  } = req.body;

  if (purchaseConfirmed !== true) {
    res.status(400).json({
      success: false,
      message: "Explicit purchase confirmation is required.",
    });
    return;
  }

  if (
    typeof leadId !== "string" ||
    !mongoose.isValidObjectId(leadId)
  ) {
    res.status(400).json({
      success: false,
      message: "A valid leadId is required.",
    });
    return;
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    res.status(400).json({
      success: false,
      message: "A confirmed quantity of at least 1 is required.",
    });
    return;
  }

  if (
    typeof purchaseConfirmationId !== "string" ||
    purchaseConfirmationId.trim().length < 8 ||
    purchaseConfirmationId.trim().length > 100
  ) {
    res.status(400).json({
      success: false,
      message: "A valid purchaseConfirmationId is required.",
    });
    return;
  }

  const confirmationId = purchaseConfirmationId.trim();

  let session: mongoose.ClientSession | undefined;

  try {
    // A repeated request must not create another order.
    const existingOrder = await Order.findOne({
      purchaseConfirmationId: confirmationId,
    });

    if (existingOrder) {
      const sameRequest =
        existingOrder.lead.toString() === leadId &&
        existingOrder.quantity === quantity;

      if (!sameRequest) {
        res.status(409).json({
          success: false,
          message:
            "This confirmation ID is already associated with a different order.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "This purchase confirmation was already processed.",
        data: existingOrder,
        duplicate: true,
      });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
      return;
    }

    if (lead.status === "won" || lead.status === "lost") {
      res.status(409).json({
        success: false,
        message: "This lead is already closed.",
      });
      return;
    }

    if (!lead.selectedLaptop?.trim()) {
      res.status(400).json({
        success: false,
        message: "The lead has no selected laptop.",
      });
      return;
    }

    // Match the selected laptop by exact name, ignoring letter case.
    const escapedName = lead.selectedLaptop
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const product = await Product.findOne({
      name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message:
          "Selected laptop was not found in the product catalogue.",
      });
      return;
    }

    session = await mongoose.startSession();

    let createdOrder: InstanceType<typeof Order> | undefined;
    let duplicate = false;

    await session.withTransaction(async () => {
      // Recheck inside the transaction to handle concurrent requests.
      const existing = await Order.findOne({
        purchaseConfirmationId: confirmationId,
      }).session(session!);

      if (existing) {
        const sameRequest =
          existing.lead.toString() === leadId &&
          existing.product.toString() === product._id.toString() &&
          existing.quantity === quantity;

        if (!sameRequest) {
          throw new Error("CONFIRMATION_ID_REUSED");
        }

        createdOrder = existing;
        duplicate = true;
        return;
      }

      // Reserve stock only if sufficient unreserved stock remains.
      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          product: product._id,
          $expr: {
            $lte: [
              { $add: ["$reserved", quantity] },
              "$stock",
            ],
          },
        },
        {
          $inc: { reserved: quantity },
        },
        {
          new: true,
          session: session!,
        }
      );

      if (!updatedInventory) {
        const inventoryExists = await Inventory.exists({
          product: product._id,
        }).session(session!);

        throw new Error(
          inventoryExists
            ? "INSUFFICIENT_STOCK"
            : "INVENTORY_NOT_FOUND"
        );
      }

      const [order] = await Order.create(
  [
    {
      purchaseConfirmationId: confirmationId,
      customer: lead.customer,
      lead: lead._id,
      product: product._id,
      quantity,
      unitPrice: product.price,
      totalAmount: product.price * quantity,
      status: "confirmed",
      reservationStatus: "reserved",
    },
  ],
  { session: session! }
);

// NEW: Create the invoice in the same transaction.
const subtotal = product.price * quantity;
const taxAmount = 0;

await Invoice.create(
  [
    {
      invoiceNumber: `REL-INV-${order._id.toString().toUpperCase()}`,
      order: order._id,
      customer: lead.customer,
      lead: lead._id,
      product: product._id,
      quantity,
      unitPrice: product.price,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      currency: "INR",
      status: "issued",
      issuedAt: new Date(),
    },
  ],
  { session: session! }
);

createdOrder = order;
    });

    
if (!createdOrder) {
  throw new Error("ORDER_CREATION_FAILED");
}

res.status(duplicate ? 200 : 201).json({
  success: true,
  message: duplicate
    ? "This purchase confirmation was already processed."
    : "Order created and inventory reserved successfully.",
  data: createdOrder,
  ...(duplicate ? { duplicate: true } : {}),
});

  } catch (error: unknown) {
    await logCallFailureSafely(
      String(req.body?.customerId ?? req.body?.leadId ?? "unavailable"),
      "Purchase confirmation failed",
      error
    );
    const mongoError = error as { code?: number };

    if (
      error instanceof Error &&
      error.message === "CONFIRMATION_ID_REUSED"
    ) {
      res.status(409).json({
        success: false,
        message:
          "This confirmation ID is already associated with a different order.",
      });
      return;
    }

    if (mongoError.code === 11000) {
      try {
        const existing = await Order.findOne({
          purchaseConfirmationId: confirmationId,
        });

        if (
          existing &&
          existing.lead.toString() === leadId &&
          existing.quantity === quantity
        ) {
          res.status(200).json({
            success: true,
            message: "This purchase confirmation was already processed.",
            data: existing,
            duplicate: true,
          });
          return;
        }
      } catch (lookupError) {
        console.error("Duplicate order lookup error:", lookupError);
        await logCallFailureSafely(
          String(leadId ?? "unavailable"),
          "Duplicate order lookup failed",
          lookupError
        );
      }

      res.status(409).json({
        success: false,
        message: "Duplicate order confirmation.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "INVENTORY_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message: "No inventory record exists for this laptop.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_STOCK"
    ) {
      res.status(409).json({
        success: false,
        message: "Insufficient stock to fulfil this order.",
      });
      return;
    }

    console.error("Create order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { orderId } = req.params;

  if (!mongoose.isValidObjectId(orderId)) {
    res.status(400).json({
      success: false,
      message: "A valid orderId is required.",
    });
    return;
  }

  let session: mongoose.ClientSession | undefined;

  try {
    session = await mongoose.startSession();

    let cancelledOrder: InstanceType<typeof Order> | null = null;
    let alreadyCancelled = false;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session!);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.status === "cancelled") {
        alreadyCancelled = true;
        cancelledOrder = order;
        return;
      }

      if (order.status === "fulfilled") {
        throw new Error("ORDER_ALREADY_FULFILLED");
      }

      if (order.reservationStatus === "reserved") {
        const inventory = await Inventory.findOneAndUpdate(
          {
            product: order.product,
            reserved: { $gte: order.quantity },
          },
          {
            $inc: { reserved: -order.quantity },
          },
          {
            new: true,
            session: session!,
          }
        );

        if (!inventory) {
          throw new Error("RESERVATION_RELEASE_FAILED");
        }
      }

      order.status = "cancelled";
      order.reservationStatus = "released";

      await order.save({ session: session! });
      cancelledOrder = order;
    });

    res.status(200).json({
      success: true,
      message: alreadyCancelled
        ? "Order was already cancelled; inventory was not released again."
        : "Order cancelled and reserved inventory released successfully.",
      data: cancelledOrder,
    });
  } catch (error: unknown) {
    await logCallFailureSafely(
      String(req.body?.customerId ?? req.body?.orderId ?? "unavailable"),
      "Order cancellation failed",
      error
    );
    if (
      error instanceof Error &&
      error.message === "ORDER_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message: "Order not found.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_ALREADY_FULFILLED"
    ) {
      res.status(409).json({
        success: false,
        message: "A fulfilled order cannot be cancelled.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "RESERVATION_RELEASE_FAILED"
    ) {
      res.status(409).json({
        success: false,
        message: "Reservation could not be safely released.",
      });
      return;
    }

    console.error("Cancel order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


export const fulfillOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { orderId } = req.params;

  if (!mongoose.isValidObjectId(orderId)) {
    res.status(400).json({
      success: false,
      message: "A valid orderId is required.",
    });
    return;
  }

  let session: mongoose.ClientSession | undefined;

  try {
    session = await mongoose.startSession();

    let fulfilledOrder: InstanceType<typeof Order> | null = null;
    let alreadyFulfilled = false;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session!);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.status === "fulfilled") {
        alreadyFulfilled = true;
        fulfilledOrder = order;
        return;
      }

      if (order.status !== "confirmed") {
        throw new Error("ORDER_NOT_CONFIRMED");
      }

      if (order.reservationStatus !== "reserved") {
        throw new Error("RESERVATION_NOT_ACTIVE");
      }

      // Deduct both total stock and reserved stock exactly once.
      const inventory = await Inventory.findOneAndUpdate(
        {
          product: order.product,
          stock: { $gte: order.quantity },
          reserved: { $gte: order.quantity },
        },
        {
          $inc: {
            stock: -order.quantity,
            reserved: -order.quantity,
          },
        },
        {
          new: true,
          session: session!,
        }
      );

      if (!inventory) {
        throw new Error("INVENTORY_UPDATE_FAILED");
      }

      order.status = "fulfilled";
      order.reservationStatus = "released";

      await order.save({ session: session! });

      fulfilledOrder = order;
    });

    res.status(200).json({
      success: true,
      message: alreadyFulfilled
        ? "Order was already fulfilled; inventory was not deducted again."
        : "Order fulfilled and inventory stock deducted successfully.",
      data: fulfilledOrder,
      alreadyFulfilled,
    });
  } catch (error: unknown) {
    await logCallFailureSafely(
      String(req.body?.customerId ?? req.body?.orderId ?? "unavailable"),
      "Order fulfilment failed",
      error
    );
    const message =
      error instanceof Error ? error.message : "";

    const errors: Record<string, { status: number; message: string }> = {
      ORDER_NOT_FOUND: {
        status: 404,
        message: "Order not found.",
      },
      ORDER_NOT_CONFIRMED: {
        status: 409,
        message: "Only confirmed orders can be fulfilled.",
      },
      RESERVATION_NOT_ACTIVE: {
        status: 409,
        message: "This order has no active inventory reservation.",
      },
      INVENTORY_UPDATE_FAILED: {
        status: 409,
        message: "Inventory could not be safely updated.",
      },
    };

    const knownError = errors[message];

    if (knownError) {
      res.status(knownError.status).json({
        success: false,
        message: knownError.message,
      });
      return;
    }

    console.error("Fulfil order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fulfil order.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const getOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const orders = await Order.find()
      .populate("customer", "name phone")
      .populate("product", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    await logCallFailureSafely("unavailable", "Order lookup failed", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};