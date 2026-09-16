import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Supplier } from "@/models/Supplier";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireAuth, requireRole } from "@/lib/session";
import { validateSupplierInput } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    await connectToDatabase();

    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      return NextResponse.json({ error: "Supplier tidak ditemukan." }, { status: 404 });
    }

    // Get stock-in movements referencing this supplier
    const movements = await InventoryMovement.find({
      type: "STOCK_IN",
      referenceId: id,
    })
      .populate("productId", "name sku unit")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      supplier: { ...supplier, _id: supplier._id.toString() },
      history: movements,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data supplier." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json();
    const validation = validateSupplierInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updated = await Supplier.findByIdAndUpdate(
      id,
      validation.sanitized,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Supplier tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Data supplier berhasil diperbarui.",
      supplier: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui supplier." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    await connectToDatabase();

    const deleted = await Supplier.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Supplier tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Supplier berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus supplier." },
      { status: 500 }
    );
  }
}
