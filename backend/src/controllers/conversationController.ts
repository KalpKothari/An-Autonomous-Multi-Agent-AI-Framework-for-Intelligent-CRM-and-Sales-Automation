import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Customer from "../models/Customer";
import Lead from "../models/Lead";
import { saveConversation } from "../services/conversationService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      customerId,
      leadId,
      channel,
      direction,
      transcript,
      summary,
      intent,
      startedAt,
      endedAt,
    } = req.body;

    if (!customerId || !channel || !direction) {
      res.status(400).json({
        success: false,
        message: "customerId, channel and direction are required",
      });
      return;
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    if (leadId) {
      const lead = await Lead.findById(leadId);

      if (!lead) {
        res.status(404).json({
          success: false,
          message: "Lead not found",
        });
        return;
      }
    }

    const conversation = await saveConversation({
      customerId,
      leadId,
      channel,
      direction,
      transcript,
      summary,
      intent,
      startedAt: startedAt
        ? new Date(startedAt)
        : undefined,
      endedAt: endedAt
        ? new Date(endedAt)
        : undefined,
    });

    await conversation.populate("customer");
    await conversation.populate("lead");

    res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      data: conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Conversation saving failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
};

export const getConversations = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const conversations = await Conversation.find()
      .populate("customer")
      .populate("lead")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Conversation lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};