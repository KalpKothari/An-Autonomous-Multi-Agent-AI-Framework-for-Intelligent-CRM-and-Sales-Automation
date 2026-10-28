import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  findOrCreateCustomerController,
} from "../controllers/customerController";

const router = Router();

router.post("/", createCustomer);
router.get("/", getCustomers);
router.post("/find-or-create", findOrCreateCustomerController);

export default router;