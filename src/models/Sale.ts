import mongoose, { Schema, Document, Model } from "mongoose";
import { PaymentMethod } from "@/types";

export interface ISaleItemSubdoc {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ISaleDocument extends Document {
  invoiceNumber: string;
  items: ISaleItemSubdoc[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItemSubdoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISaleDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "qris", "transfer"],
      required: true,
    },
    paidAmount: { type: Number, required: true, min: 0 },
    changeAmount: { type: Number, required: true, default: 0 },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cashierName: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Sale: Model<ISaleDocument> =
  mongoose.models.Sale || mongoose.model<ISaleDocument>("Sale", SaleSchema);
