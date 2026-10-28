import { Router } from "express";
import {
  createFollowUp,
  getFollowUps,
} from "../controllers/followUpController";

const router = Router();

router.post("/", createFollowUp);
router.get("/", getFollowUps);

export default router;