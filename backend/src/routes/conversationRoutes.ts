import { Router } from "express";
import {
  createConversation,
  getConversations,
} from "../controllers/conversationController";

const router = Router();

router.post("/", createConversation);
router.get("/", getConversations);

export default router;