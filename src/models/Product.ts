import mongoose, { Schema, Document, Model } from "mongoose";
import { ProductUnit } from "@/types";

export interface IProductDocument extends Document {
  name: string;
  sku: string;
  categoryId: mongoose.Types.ObjectId;
  description?: string;
  image?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  unit: ProductUnit;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    minimumStock: { type: Number, required: true, default: 5, min: 0 },
    unit: {
      type: String,
      enum: ["pcs", "box", "kg", "liter", "bottle", "pack"],
      default: "pcs",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>("Product", ProductSchema);
