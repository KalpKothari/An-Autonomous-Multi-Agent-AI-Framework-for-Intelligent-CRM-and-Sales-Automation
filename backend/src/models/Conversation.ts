import mongoose, { Document, Schema } from "mongoose";

export type ConversationChannel =
  | "voice"
  | "chat"
  | "email"
  | "other";

export type ConversationDirection =
  | "inbound"
  | "outbound";

export interface IConversation extends Document {
  customer: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  channel: ConversationChannel;
  direction: ConversationDirection;
  transcript?: string;
  summary?: string;
  intent?: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },

    channel: {
      type: String,
      enum: ["voice", "chat", "email", "other"],
      required: true,
      default: "voice",
    },

    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },

    transcript: {
      type: String,
    },

    summary: {
      type: String,
    },

    intent: {
      type: String,
      trim: true,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default Conversation;