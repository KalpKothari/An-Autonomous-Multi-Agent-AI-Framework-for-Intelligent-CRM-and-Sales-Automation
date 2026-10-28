
import mongoose, { Document, Schema } from "mongoose";

export type OrderStatus =
  | "confirmed"
  | "cancelled"
  | "fulfilled";

export interface IOrder extends Document {
  customer: mongoose.Types.ObjectId;
  lead: mongoose.Types.ObjectId;
  purchaseConfirmationId: string;
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  reservationStatus: "reserved" | "released" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    purchaseConfirmationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "fulfilled"],
      default: "confirmed",
    },
    reservationStatus: {
      type: String,
      enum: ["reserved", "released", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
