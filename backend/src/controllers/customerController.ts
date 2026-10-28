import { Request, Response } from "express";
import Customer from "../models/Customer";
import { findOrCreateCustomer } from "../services/customerService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, company } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
      return;
    }

    const customer = await Customer.create({
      name,
      email,
      phone,
      company,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Customer creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};

export const getCustomers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const customers = await Customer.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Customer lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

export const findOrCreateCustomerController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, phone, email, company } = req.body;

    if (!phone) {
      res.status(400).json({
        success: false,
        message: "phone is required",
      });
      return;
    }

    const result = await findOrCreateCustomer({
      name,
      phone,
      email,
      company,
    });

    res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      data: result.customer,
    });
  } catch (error) {
    console.error("Find or create customer error:", error);
    await logCallFailureSafely(
      String(req.body?.customerId ?? "unavailable"),
      "Customer identification or creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to find or create customer",
    });
  }
};