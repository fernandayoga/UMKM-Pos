import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { requireAuth, requireRole } from "@/lib/session";
import { validateCategoryInput } from "@/lib/validations";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    // Fetch categories with product count
    const categories = await Category.find().sort({ name: 1 }).lean();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          categoryId: cat._id,
          isActive: true,
        });
        return {
          ...cat,
          _id: cat._id.toString(),
          productCount,
        };
      })
    );

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data kategori." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateCategoryInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${validation.sanitized.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kategori dengan nama "${validation.sanitized.name}" sudah ada.` },
        { status: 400 }
      );
    }

    const newCategory = await Category.create({
      name: validation.sanitized.name,
      description: validation.sanitized.description,
    });

    return NextResponse.json(
      { message: "Kategori berhasil ditambahkan.", category: newCategory },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan kategori." },
      { status: 500 }
    );
  }
}
