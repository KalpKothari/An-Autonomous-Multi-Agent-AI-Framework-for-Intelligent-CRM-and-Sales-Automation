import mongoose, { Document, Schema } from "mongoose";

export interface IInventory extends Document {
  product: mongoose.Types.ObjectId;
  stock: number;
  reserved: number;
  warehouse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    warehouse: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Inventory = mongoose.model<IInventory>(
  "Inventory",
  inventorySchema
);

export default Inventory;