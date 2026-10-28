import { Request, Response } from "express";
import Inventory from "../models/Inventory";
import Product from "../models/Product";
import { findProductWithInventory } from "../services/inventoryLookupService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createInventory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      productId,
      stock,
      reserved,
      warehouse,
    } = req.body;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: "productId is required",
      });
      return;
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const existingInventory = await Inventory.findOne({
      product: productId,
    });

    if (existingInventory) {
      res.status(409).json({
        success: false,
        message: "Inventory already exists for this product",
      });
      return;
    }

    const inventory = await Inventory.create({
      product: productId,
      stock,
      reserved,
      warehouse,
    });

    await inventory.populate("product");

    res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    await logCallFailureSafely(
      String(req.body?.productId ?? "unavailable"),
      "Inventory creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create inventory",
    });
  }
};

export const getInventory = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory = await Inventory.find()
      .populate("product")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Inventory lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};

export const checkInventory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productName } = req.body;

    if (!productName) {
      await logCallFailureSafely(
        "unavailable",
        "Inventory lookup failed",
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
        "Inventory lookup failed",
        new Error("the requested product was not found")
      );
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Inventory lookup error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Inventory lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to check inventory",
    });
  }
};