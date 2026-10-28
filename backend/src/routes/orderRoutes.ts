
import { Router } from "express";
import {
  createOrder,
  getOrders,
  cancelOrder,
  fulfillOrder,
} from "../controllers/orderController";

const router = Router();

router.get("/", getOrders);
router.post("/", createOrder);
router.post("/:orderId/cancel", cancelOrder);
router.post("/:orderId/fulfill", fulfillOrder);

export default router;
