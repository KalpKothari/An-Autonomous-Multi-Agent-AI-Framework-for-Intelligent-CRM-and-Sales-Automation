import mongoose, { Document, Schema } from "mongoose";

export type FollowUpStatus =
  | "pending"
  | "completed"
  | "cancelled";

export type FollowUpType =
  | "call"
  | "email"
  | "message"
  | "other";

export interface IFollowUp extends Document {
  customer: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  type: FollowUpType;
  scheduledAt: Date;
  status: FollowUpStatus;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const followUpSchema = new Schema<IFollowUp>(
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

    type: {
      type: String,
      enum: ["call", "email", "message", "other"],
      required: true,
      default: "call",
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const FollowUp = mongoose.model<IFollowUp>(
  "FollowUp",
  followUpSchema
);

export default FollowUp;