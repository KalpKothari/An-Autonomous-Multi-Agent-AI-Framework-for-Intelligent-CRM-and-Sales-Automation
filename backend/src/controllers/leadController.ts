import { Request, Response } from "express";
import Lead from "../models/Lead";
import Customer from "../models/Customer";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createLead = async (
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
      notes,
    } = req.body;

    if (!customerId) {
      await logCallFailureSafely(
        "unavailable",
        "Lead creation failed",
        new Error("customer ID was not provided")
      );
      res.status(400).json({
        success: false,
        message: "customerId is required",
      });
      return;
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      await logCallFailureSafely(
        String(customerId),
        "Lead creation failed",
        new Error("the customer ID does not match an existing customer")
      );
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    const lead = await Lead.create({
      customer: customerId,
      product,
      quantity,
      budget,
      timeRequirement,
      intent,
      urgency,
      notes,
    });

    await lead.populate("customer");

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create lead error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Lead creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create lead",
    });
  }
};

export const getLeads = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const leads = await Lead.find()
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Get leads error:", error);
    await logCallFailureSafely("unavailable", "Lead lookup failed", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};