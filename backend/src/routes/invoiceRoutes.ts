
import { Router } from "express";
import {
  downloadInvoicePdf,
  getInvoiceByOrder,
} from "../controllers/invoiceController";

const router = Router();

router.get("/order/:orderId", getInvoiceByOrder);
router.get("/:invoiceId/pdf", downloadInvoicePdf);

export default router;
