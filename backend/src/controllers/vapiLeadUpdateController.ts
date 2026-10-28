
import { Request, Response } from "express";
import Lead from "../models/Lead";
import { logCallFailureSafely } from "../utils/eventLogger";

export const updateLeadForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      leadId,
      product,
      selectedLaptop,
      quantity,
      budget,
      timeRequirement,
      intent,
      urgency,
    } = req.body;

    if (typeof leadId !== "string" || !leadId.trim()) {
      res.status(400).json({
        success: false,
        message: "leadId is required",
      });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (product !== undefined) {
      if (typeof product !== "string" || !product.trim()) {
        res.status(400).json({
          success: false,
          message: "product must be a non-empty string",
        });
        return;
      }
      updates.product = product.trim();
    }

    if (selectedLaptop !== undefined) {
      if (
        typeof selectedLaptop !== "string" ||
        !selectedLaptop.trim()
      ) {
        res.status(400).json({
          success: false,
          message: "selectedLaptop must be a non-empty string",
        });
        return;
      }
      updates.selectedLaptop = selectedLaptop.trim();
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);

      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        res.status(400).json({
          success: false,
          message: "quantity must be a positive integer",
        });
        return;
      }

      updates.quantity = parsedQuantity;
    }

    if (budget !== undefined) {
      const parsedBudget = Number(budget);

      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        res.status(400).json({
          success: false,
          message: "budget must be a non-negative number",
        });
        return;
      }

      updates.budget = parsedBudget;
    }

    if (timeRequirement !== undefined) {
      if (typeof timeRequirement !== "string") {
        res.status(400).json({
          success: false,
          message: "timeRequirement must be a string",
        });
        return;
      }

      updates.timeRequirement = timeRequirement.trim();
    }

    if (intent !== undefined) {
      if (
        typeof intent !== "string" ||
        !["purchase", "inquiry", "support", "other"].includes(intent)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid intent",
        });
        return;
      }

      updates.intent = intent;
    }

    if (urgency !== undefined) {
      if (
        typeof urgency !== "string" ||
        !["low", "medium", "high"].includes(urgency)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid urgency",
        });
        return;
      }

      updates.urgency = urgency;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one field to update is required",
      });
      return;
    }

    const lead = await Lead.findByIdAndUpdate(
      leadId.trim(),
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!lead) {
      res.status(404).json({
        success: false,
        message: "Lead not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      leadId: lead._id,
      lead,
      message: "Lead updated successfully.",
    });
  } catch (error) {
    console.error("Vapi lead update error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Vapi lead update failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update lead",
    });
  }
};
