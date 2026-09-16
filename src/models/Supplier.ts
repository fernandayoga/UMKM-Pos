import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISupplierDocument extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplierDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export const Supplier: Model<ISupplierDocument> =
  mongoose.models.Supplier || mongoose.model<ISupplierDocument>("Supplier", SupplierSchema);
