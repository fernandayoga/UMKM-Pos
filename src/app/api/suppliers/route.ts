import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Supplier } from "@/models/Supplier";
import { requireAuth, requireRole } from "@/lib/session";
import { validateSupplierInput } from "@/lib/validations";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();
    const suppliers = await Supplier.find().sort({ name: 1 }).lean();

    return NextResponse.json({
      suppliers: suppliers.map((s) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data supplier." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateSupplierInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const supplier = await Supplier.create(validation.sanitized);

    return NextResponse.json(
      { message: "Supplier berhasil ditambahkan.", supplier },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menambahkan supplier." },
      { status: 500 }
    );
  }
}
