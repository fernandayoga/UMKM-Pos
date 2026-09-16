import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));

    const filter: any = {};
    if (productId) filter.productId = productId;
    if (type && ["SALE", "STOCK_IN", "ADJUSTMENT"].includes(type)) {
      filter.type = type;
    }

    const movements = await InventoryMovement.find(filter)
      .populate("productId", "name sku unit")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = movements.map((m: any) => ({
      _id: m._id.toString(),
      productId: m.productId?._id ? m.productId._id.toString() : m.productId?.toString(),
      productName: m.productId?.name || "Produk",
      sku: m.productId?.sku || "-",
      unit: m.productId?.unit || "pcs",
      type: m.type,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      referenceId: m.referenceId || "-",
      note: m.note || "-",
      createdByName: m.createdBy?.name || "Sistem",
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ movements: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil riwayat mutasi stok." },
      { status: 500 }
    );
  }
}
