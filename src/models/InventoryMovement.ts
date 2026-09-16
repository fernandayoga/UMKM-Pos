import mongoose, { Schema, Document, Model } from "mongoose";
import { MovementType } from "@/types";

export interface IInventoryMovementDocument extends Document {
  productId: mongoose.Types.ObjectId;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  note?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovementDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: {
      type: String,
      enum: ["SALE", "STOCK_IN", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: String, default: "" },
    note: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const InventoryMovement: Model<IInventoryMovementDocument> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovementDocument>("InventoryMovement", InventoryMovementSchema);
