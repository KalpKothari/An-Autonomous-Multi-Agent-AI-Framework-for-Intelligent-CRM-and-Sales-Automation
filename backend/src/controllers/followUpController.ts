import { Request, Response } from "express";
import FollowUp from "../models/FollowUp";
import Customer from "../models/Customer";
import Lead from "../models/Lead";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createFollowUp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      customerId,
      leadId,
      type,
      scheduledAt,
      notes,
    } = req.body;

    if (!customerId || !scheduledAt) {
      res.status(400).json({
        success: false,
        message: "customerId and scheduledAt are required",
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

    const followUp = await FollowUp.create({
      customer: customerId,
      lead: leadId,
      type,
      scheduledAt,
      notes,
    });

    await followUp.populate("customer");
    await followUp.populate("lead");

    res.status(201).json({
      success: true,
      message: "Follow-up created successfully",
      data: followUp,
    });
  } catch (error) {
    console.error("Create follow-up error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Follow-up creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create follow-up",
    });
  }
};

export const getFollowUps = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const followUps = await FollowUp.find()
      .populate("customer")
      .populate("lead")
      .sort({ scheduledAt: 1 });

    res.status(200).json({
      success: true,
      count: followUps.length,
      data: followUps,
    });
  } catch (error) {
    console.error("Get follow-ups error:", error);
    await logCallFailureSafely("unavailable", "Follow-up lookup failed", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
    });
  }
};