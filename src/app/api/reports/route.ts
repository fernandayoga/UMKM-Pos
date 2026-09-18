import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { requireAuth, requireRole } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period") || "this_month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1); // default this month
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === "this_week") {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay());
      firstDay.setHours(0, 0, 0, 0);
      startDate = firstDay;
    } else if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch sales within date range
    const sales = await Sale.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalItemsSold = 0;
    const totalTransactions = sales.length;

    // Aggregators for product performance
    const productStatsMap = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        totalSold: number;
        revenue: number;
        cogs: number;
        profit: number;
      }
    >();

    // Daily breakdown for chart
    const dailyMap = new Map<
      string,
      { date: string; revenue: number; profit: number; grossProfit: number; transactions: number }
    >();

    for (const sale of sales) {
      const dateKey = new Date(sale.createdAt).toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, revenue: 0, profit: 0, grossProfit: 0, transactions: 0 });
      }
      const dayData = dailyMap.get(dateKey)!;
      dayData.transactions += 1;

      for (const item of sale.items) {
        const itemRevenue = item.subtotal;
        const itemCogs = item.costPrice * item.quantity;
        const itemProfit = itemRevenue - itemCogs;

        totalRevenue += itemRevenue;
        totalCogs += itemCogs;
        totalItemsSold += item.quantity;

        dayData.revenue += itemRevenue;
        dayData.profit += itemProfit;
        dayData.grossProfit += itemProfit;

        const pid = item.productId.toString();
        if (!productStatsMap.has(pid)) {
          productStatsMap.set(pid, {
            productId: pid,
            name: item.productName,
            sku: item.sku,
            totalSold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
          });
        }
        const pStat = productStatsMap.get(pid)!;
        pStat.totalSold += item.quantity;
        pStat.revenue += itemRevenue;
        pStat.cogs += itemCogs;
        pStat.profit += itemProfit;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const profitMarginPercent =
      totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Convert dailyMap to sorted array
    const chartData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Product performance lists
    const productStatsList = Array.from(productStatsMap.values());
    const bestSellingProducts = [...productStatsList]
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    const highestRevenueProducts = [...productStatsList]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const highestProfitProducts = [...productStatsList]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // Low stock count
    const lowStockCount = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ["$stock", "$minimumStock"] },
    });

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCogs,
        grossProfit,
        profitMarginPercent,
        totalTransactions,
        totalItemsSold,
        lowStockCount,
      },
      chartData,
      bestSellingProducts,
      highestRevenueProducts,
      highestProfitProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghasilkan laporan." },
      { status: 500 }
    );
  }
}
