import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Sale } from "@/models/Sale";
import { requireAuth, requireRole } from "@/lib/session";
import { validateProductInput } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    await connectToDatabase();

    const product = await Product.findById(id).populate("categoryId", "name").lean();
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        _id: product._id.toString(),
        categoryName: (product.categoryId as any)?.name || "Tanpa Kategori",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data produk." },
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
    const validation = validateProductInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify category exists
    const categoryExists = await Category.findById(validation.sanitized.categoryId);
    if (!categoryExists) {
      return NextResponse.json(
        { error: "Kategori yang dipilih tidak valid." },
        { status: 400 }
      );
    }

    // Check duplicate SKU on other products
    const existingSku = await Product.findOne({
      _id: { $ne: id },
      sku: validation.sanitized.sku,
    });
    if (existingSku) {
      return NextResponse.json(
        { error: `SKU "${validation.sanitized.sku}" sudah digunakan oleh produk lain.` },
        { status: 400 }
      );
    }

    // Update product fields (stock is managed via inventory movements only)
    const updated = await Product.findByIdAndUpdate(
      id,
      {
        name: validation.sanitized.name,
        sku: validation.sanitized.sku,
        categoryId: validation.sanitized.categoryId,
        description: validation.sanitized.description,
        image: validation.sanitized.image,
        costPrice: validation.sanitized.costPrice,
        sellingPrice: validation.sanitized.sellingPrice,
        minimumStock: validation.sanitized.minimumStock,
        unit: validation.sanitized.unit,
        isActive: validation.sanitized.isActive,
      },
      { new: true }
    ).populate("categoryId", "name");

    if (!updated) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Data produk berhasil diperbarui.",
      product: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui data produk." },
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

    // Check if product was already sold in any historical transaction
    const hasSales = await Sale.findOne({ "items.productId": id });

    if (hasSales) {
      // Soft-delete to preserve transaction history and reports
      await Product.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json({
        message: "Produk telah dinonaktifkan (karena memiliki riwayat transaksi).",
      });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Produk berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus produk." },
      { status: 500 }
    );
  }
}
