import { Request, Response } from "express";
import { findProductWithInventory } from "../services/inventoryLookupService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const checkInventoryForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productName } = req.body;

    if (!productName) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi inventory lookup failed",
        new Error("product name was not provided")
      );
      res.status(400).json({
        success: false,
        message: "productName is required",
      });
      return;
    }

    const result = await findProductWithInventory(productName);

    if (!result) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi inventory lookup failed",
        new Error("the requested product was not found")
      );
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const stock = result.inventory?.stock ?? 0;
    const reserved = result.inventory?.reserved ?? 0;
    const available = stock - reserved;

    const requestedQuantity = Number(req.body.quantity) || 0;
const canFulfill =
  requestedQuantity > 0
    ? available >= requestedQuantity
    : null;

res.status(200).json({
  success: true,
  product: result.product.name,
  requestedQuantity,
  availableStock: available,
  canFulfill,
  message:
    requestedQuantity > 0
      ? canFulfill
        ? `Yes, ${requestedQuantity} units can be fulfilled. ${available} units are currently available.`
        : `Only ${available} units are currently available, so the requested quantity of ${requestedQuantity} cannot be fully fulfilled.`
      : `${available} units are currently available.`,
});
  } catch (error) {
    console.error("Vapi inventory check error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Vapi inventory lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to check inventory",
    });
  }
};