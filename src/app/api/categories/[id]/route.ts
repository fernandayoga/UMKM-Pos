import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { requireRole } from "@/lib/session";
import { validateCategoryInput } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json();
    const validation = validateCategoryInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check duplicate name on different id
    const existing = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${validation.sanitized.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kategori dengan nama "${validation.sanitized.name}" sudah ada.` },
        { status: 400 }
      );
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      {
        name: validation.sanitized.name,
        description: validation.sanitized.description,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Kategori berhasil diperbarui.",
      category: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui kategori." },
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

    // Safe delete rule: check if any products are using this category
    const linkedProductsCount = await Product.countDocuments({
      categoryId: id,
      isActive: true,
    });

    if (linkedProductsCount > 0) {
      return NextResponse.json(
        {
          error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${linkedProductsCount} produk aktif. Ubah kategori produk terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Kategori berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}
