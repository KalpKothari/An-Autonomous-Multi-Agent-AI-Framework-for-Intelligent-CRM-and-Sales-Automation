import Conversation from "../models/Conversation";

interface SaveConversationData {
  customerId: string;
  leadId?: string;
  channel: "voice" | "chat" | "email" | "other";
  direction: "inbound" | "outbound";
  transcript?: string;
  summary?: string;
  intent?: string;
  startedAt?: Date;
  endedAt?: Date;
}

export const saveConversation = async (
  data: SaveConversationData
) => {
  const conversation = await Conversation.create({
    customer: data.customerId,
    lead: data.leadId,
    channel: data.channel,
    direction: data.direction,
    transcript: data.transcript,
    summary: data.summary,
    intent: data.intent,
    startedAt: data.startedAt ?? new Date(),
    endedAt: data.endedAt,
  });

  return conversation;
};