import { Router } from "express";
import {
  createInventory,
  getInventory,
} from "../controllers/inventoryController";
import { checkInventory } from "../controllers/inventoryController";

const router = Router();

router.post("/", createInventory);
router.get("/", getInventory);
router.post("/check", checkInventory);

export default router;