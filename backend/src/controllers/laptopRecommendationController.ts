
import { Request, Response } from "express";
import { recommendLaptops } from "../services/laptopRecommendationService";
import { logCallFailureSafely } from "../utils/eventLogger";

export const recommendLaptopsForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      useCase,
      brand,
      budget,
      quantity,
      limit,
    } = req.body;

    if (
      budget !== undefined &&
      (!Number.isFinite(Number(budget)) || Number(budget) <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "budget must be a positive number",
      });
      return;
    }

    if (
      quantity !== undefined &&
      (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "quantity must be a positive integer",
      });
      return;
    }

    if (
      limit !== undefined &&
      (!Number.isInteger(Number(limit)) ||
        Number(limit) <= 0 ||
        Number(limit) > 3)
    ) {
      res.status(400).json({
        success: false,
        message: "limit must be an integer between 1 and 3",
      });
      return;
    }

    const result = await recommendLaptops({
      useCase:
        typeof useCase === "string" ? useCase.trim() : undefined,
      brand:
        typeof brand === "string" ? brand.trim() : undefined,
      budget: budget === undefined ? undefined : Number(budget),
      quantity: quantity === undefined ? undefined : Number(quantity),
      limit: limit === undefined ? 3 : Number(limit),
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Laptop recommendation error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Laptop recommendation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to recommend laptops",
    });
  }
};
