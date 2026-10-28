import { Request, Response } from "express";
import Product from "../models/Product";
import { logCallFailureSafely } from "../utils/eventLogger";

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      sku,
      description,
      category,
      price,
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
      return;
    }

    const product = await Product.create({
      name,
      sku,
      description,
      category,
      price,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Product creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

export const getProducts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);
    await logCallFailureSafely("unavailable", "Product lookup failed", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};