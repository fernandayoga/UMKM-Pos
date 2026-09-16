import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireAuth, requireRole } from "@/lib/session";
import { validateProductInput } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId")?.trim() || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const sort = searchParams.get("sort") || "name_asc";

    const filter: any = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (categoryId && categoryId !== "all") {
      filter.categoryId = categoryId;
    }

    if (lowStock) {
      filter.$expr = { $lte: ["$stock", "$minimumStock"] };
    }

    let sortOption: any = { name: 1 };
    if (sort === "name_desc") sortOption = { name: -1 };
    else if (sort === "stock_asc") sortOption = { stock: 1 };
    else if (sort === "stock_desc") sortOption = { stock: -1 };
    else if (sort === "price_asc") sortOption = { sellingPrice: 1 };
    else if (sort === "price_desc") sortOption = { sellingPrice: -1 };

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort(sortOption)
      .lean();

    const formatted = products.map((p: any) => ({
      ...p,
      _id: p._id.toString(),
      categoryName: p.categoryId?.name || "Tanpa Kategori",
      categoryId: p.categoryId?._id ? p.categoryId._id.toString() : p.categoryId?.toString(),
    }));

    return NextResponse.json({ products: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data produk." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

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

    // Auto-generate SKU if empty
    let sku = validation.sanitized.sku;
    if (!sku) {
      const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      sku = `SKU-${randomCode}`;
    }

    // Check duplicate SKU
    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      return NextResponse.json(
        { error: `SKU "${sku}" sudah digunakan oleh produk lain.` },
        { status: 400 }
      );
    }

    const initialStock = validation.sanitized.stock || 0;

    const newProduct = await Product.create({
      ...validation.sanitized,
      sku,
      stock: initialStock,
    });

    // If initial stock is greater than zero, record initial inventory movement
    if (initialStock > 0) {
      await InventoryMovement.create({
        productId: newProduct._id,
        type: "STOCK_IN",
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        note: "Stok awal saat penambahan produk baru",
        createdBy: user?.id,
      });
    }

    return NextResponse.json(
      { message: "Produk berhasil ditambahkan.", product: newProduct },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan produk." },
      { status: 500 }
    );
  }
}
