import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Supplier } from "@/models/Supplier";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireAuth, requireRole } from "@/lib/session";
import { validateStockInInput } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireRole(["owner", "cashier"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateStockInInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const { productId, supplierId, quantity, purchasePrice, note } = validation.sanitized;

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    let supplierName = "";
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (supplier) {
        supplierName = supplier.name;
      }
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    // Optional update costPrice if new purchase price is provided and user is owner
    const updateFields: any = {
      $inc: { stock: quantity },
    };

    if (purchasePrice && purchasePrice > 0 && user?.role === "owner") {
      updateFields.costPrice = purchasePrice;
    }

    await Product.findByIdAndUpdate(productId, updateFields);

    const movementNote = note
      ? `${note}${supplierName ? ` (Supplier: ${supplierName})` : ""}`
      : `Penerimaan stok masuk${supplierName ? ` dari ${supplierName}` : ""}`;

    const movement = await InventoryMovement.create({
      productId: product._id,
      type: "STOCK_IN",
      quantity,
      previousStock,
      newStock,
      referenceId: supplierId || "",
      note: movementNote,
      createdBy: user?.id,
    });

    return NextResponse.json(
      {
        message: `Berhasil menambahkan ${quantity} ${product.unit} ke stok ${product.name}.`,
        movement,
        newStock,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses stok masuk." },
      { status: 500 }
    );
  }
}
