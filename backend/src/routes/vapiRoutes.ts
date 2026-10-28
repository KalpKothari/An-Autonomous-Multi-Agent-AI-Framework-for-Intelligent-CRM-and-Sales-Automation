
import { Router } from "express";
import { checkInventoryForVapi } from "../controllers/vapiController";
import {
  findCustomerForVapi,
  createCustomerForVapi,
} from "../controllers/vapiCustomerController";
import { createLeadForVapi } from "../controllers/vapiLeadController";
import { updateLeadForVapi } from "../controllers/vapiLeadUpdateController";
import { recommendLaptopsForVapi } from "../controllers/laptopRecommendationController";
import { handleVapiWebhook } from "../controllers/vapiWebhookController";
import { selectLaptopForVapi } from "../controllers/vapiSelectLaptopController";
import { createOrder } from "../controllers/orderController";

const router = Router();

router.post("/check-inventory", checkInventoryForVapi);
router.post("/find-customer", findCustomerForVapi);
router.post("/create-customer", createCustomerForVapi);
router.post("/create-lead", createLeadForVapi);
router.post("/update-lead", updateLeadForVapi);
router.post("/recommend-laptops", recommendLaptopsForVapi);
router.post("/select-laptop", selectLaptopForVapi);
router.post("/confirm-purchase", createOrder);
router.post("/webhook", handleVapiWebhook);

export default router;
