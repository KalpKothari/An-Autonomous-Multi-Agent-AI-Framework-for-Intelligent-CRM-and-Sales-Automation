import { Router } from "express";
import {
  extractLead,
  extractAndCreateLead,
  getSalesDecision,
} from "../controllers/aiController";

const router = Router();

router.post("/extract-lead", extractLead);
router.post("/sales-decision", getSalesDecision);
router.post("/extract-and-create-lead", extractAndCreateLead);

export default router;