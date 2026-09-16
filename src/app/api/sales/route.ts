import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/models/Sale";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const cashierId = searchParams.get("cashierId") || "";
    const period = searchParams.get("period") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));

    const filter: any = {};

    if (search) {
      filter.invoiceNumber = { $regex: search, $options: "i" };
    }

    if (paymentMethod && ["cash", "qris", "transfer"].includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    if (cashierId) {
      filter.cashierId = cashierId;
    }

    // Date filtering
    const now = new Date();
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (period === "this_week") {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: firstDayOfWeek };
    } else if (period === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      filter.createdAt = { $gte: startOfMonth };
    } else if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = sales.map((s: any) => ({
      ...s,
      _id: s._id.toString(),
      cashierId: s.cashierId ? s.cashierId.toString() : "",
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ sales: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil riwayat transaksi penjualan." },
      { status: 500 }
    );
  }
}
