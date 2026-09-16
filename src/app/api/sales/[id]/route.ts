import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/models/Sale";
import { requireAuth } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    await connectToDatabase();

    const sale = await Sale.findById(id).lean();
    if (!sale) {
      return NextResponse.json(
        { error: "Transaksi penjualan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sale: {
        ...sale,
        _id: sale._id.toString(),
        cashierId: sale.cashierId ? sale.cashierId.toString() : "",
        createdAt: sale.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil detail transaksi penjualan." },
      { status: 500 }
    );
  }
}
