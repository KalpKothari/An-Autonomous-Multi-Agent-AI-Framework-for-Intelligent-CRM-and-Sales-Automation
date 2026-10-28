
import mongoose, { Document, Schema } from "mongoose";

export type LeadStatus =
  | "new"
  | "qualified"
  | "contacted"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadIntent =
  | "purchase"
  | "inquiry"
  | "support"
  | "other";

export type LeadUrgency =
  | "low"
  | "medium"
  | "high";

export interface ILead extends Document {
  customer: mongoose.Types.ObjectId;
  product?: string;
  selectedLaptop?: string;
  quantity?: number;
  budget?: number;
  timeRequirement?: string;
  intent: LeadIntent;
  urgency: LeadUrgency;
  status: LeadStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    product: {
      type: String,
      trim: true,
    },

    selectedLaptop: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      min: 1,
    },

    budget: {
      type: Number,
      min: 0,
    },

    timeRequirement: {
      type: String,
      trim: true,
    },

    intent: {
      type: String,
      enum: ["purchase", "inquiry", "support", "other"],
      default: "purchase",
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: [
        "new",
        "qualified",
        "contacted",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      default: "new",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
