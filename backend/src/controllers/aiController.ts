import { Request, Response } from "express";
import { extractLeadData } from "../services/salesAgentService";
import { createLeadFromAI } from "../services/leadCreationService";
import { makeSalesDecision } from "../services/salesDecisionService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const extractLead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: "message is required",
      });
      return;
    }

    const leadData = await extractLeadData(message);

    res.status(200).json({
      success: true,
      data: leadData,
    });
  } catch (error) {
    console.error("AI lead extraction error:", error);
    await logCallFailureSafely(
      "unavailable",
      "AI lead extraction failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to extract lead data",
    });
  }
};

export const extractAndCreateLead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { customerId, message } = req.body;

    if (!customerId || !message) {
      res.status(400).json({
        success: false,
        message: "customerId and message are required",
      });
      return;
    }

    const leadData = await extractLeadData(message);

    const lead = await createLeadFromAI(customerId, leadData);

    res.status(201).json({
      success: true,
      data: {
        lead,
        extractedData: leadData,
      },
    });
  } catch (error) {
    console.error("AI lead creation error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "AI lead creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to extract and create lead",
    });
  }
};

export const getSalesDecision = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: "message is required",
      });
      return;
    }

    const leadData = await extractLeadData(message);

    const decision = await makeSalesDecision(leadData);

    res.status(200).json({
      success: true,
      data: {
        extractedData: leadData,
        salesResponse: decision,
      },
    });
  } catch (error) {
    console.error("Sales decision error:", error);
    await logCallFailureSafely(
      "unavailable",
      "AI sales decision generation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to generate sales decision",
    });
  }
};