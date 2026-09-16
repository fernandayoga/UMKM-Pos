import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireRole } from "@/lib/session";
import { validateStockAdjustInput } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateStockAdjustInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const { productId, actualStock, reason } = validation.sanitized;

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    const previousStock = product.stock;
    const delta = actualStock - previousStock;

    if (delta === 0) {
      return NextResponse.json(
        { error: "Stok fisik aktual sama dengan stok sistem saat ini (tidak ada selisih)." },
        { status: 400 }
      );
    }

    product.stock = actualStock;
    await product.save();

    const movement = await InventoryMovement.create({
      productId: product._id,
      type: "ADJUSTMENT",
      quantity: delta,
      previousStock,
      newStock: actualStock,
      note: `Penyesuaian Fisik: ${reason} (Selisih: ${delta > 0 ? `+${delta}` : delta})`,
      createdBy: user?.id,
    });

    return NextResponse.json(
      {
        message: `Stok ${product.name} berhasil disesuaikan dari ${previousStock} menjadi ${actualStock} ${product.unit}.`,
        movement,
        newStock: actualStock,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal melakukan penyesuaian stok." },
      { status: 500 }
    );
  }
}
