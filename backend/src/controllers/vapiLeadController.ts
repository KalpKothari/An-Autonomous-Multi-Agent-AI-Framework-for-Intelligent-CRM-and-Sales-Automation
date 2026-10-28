
import { Request, Response } from "express";
import { createLeadFromAI } from "../services/leadCreationService";
import { ExtractedLeadData } from "../services/salesAgentService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createLeadForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      customerId,
      product,
      quantity,
      budget,
      timeRequirement,
      intent,
      urgency,
    } = req.body;

    if (!customerId || !product) {
      await logCallFailureSafely(
        String(customerId ?? "unavailable"),
        "Vapi lead creation failed",
        new Error(
          !customerId
            ? "customer ID was not provided"
            : "product was not provided"
        )
      );
      res.status(400).json({
        success: false,
        message: "customerId and product are required",
      });
      return;
    }

    const leadData: ExtractedLeadData = {
      product,
      quantity,
      budget,
      timeRequirement,
      intent: intent || "purchase",
      urgency: urgency || "medium",
    };

    const lead = await createLeadFromAI(customerId, leadData);

    res.status(201).json({
      success: true,
      leadId: lead._id,
      lead,
      message: "Lead created successfully.",
    });
  } catch (error) {
    console.error("Vapi lead creation error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Vapi lead creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create lead",
    });
  }
};
