import { connectToDatabase } from "./mongodb";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";
import { InventoryMovement } from "@/models/InventoryMovement";
import { formatRupiah } from "./utils";

/**
 * 1. Get Product Stock by query (name or sku)
 */
export async function getProductStock(query: string) {
  await connectToDatabase();
  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { sku: { $regex: query, $options: "i" } },
    ],
  })
    .populate("categoryId", "name")
    .lean();

  if (products.length === 0) {
    return {
      found: false,
      message: `Tidak ditemukan produk yang cocok dengan "${query}".`,
      products: [],
    };
  }

  return {
    found: true,
    count: products.length,
    products: products.map((p: any) => ({
      name: p.name,
      sku: p.sku,
      category: p.categoryId?.name || "Umum",
      stock: p.stock,
      minimumStock: p.minimumStock,
      unit: p.unit,
      sellingPrice: p.sellingPrice,
      sellingPriceFormatted: formatRupiah(p.sellingPrice),
      isLowStock: p.stock <= p.minimumStock,
      isOutOfStock: p.stock <= 0,
    })),
  };
}

/**
 * 2. Get Low Stock Products (stock <= minimumStock)
 */
export async function getLowStockProducts() {
  await connectToDatabase();
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ["$stock", "$minimumStock"] },
  })
    .populate("categoryId", "name")
    .sort({ stock: 1 })
    .lean();

  return {
    count: products.length,
    products: products.map((p: any) => ({
      name: p.name,
      sku: p.sku,
      category: p.categoryId?.name || "Umum",
      currentStock: p.stock,
      minimumStock: p.minimumStock,
      unit: p.unit,
      status: p.stock <= 0 ? "Habis (0)" : "Menipis",
    })),
  };
}

/**
 * 3. Get Today's Sales
 */
export async function getTodaySales() {
  await connectToDatabase();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const sales = await Sale.find({ createdAt: { $gte: startOfDay } }).lean();

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalItemsSold = 0;

  for (const s of sales) {
    totalRevenue += s.total;
    for (const it of s.items) {
      totalCogs += it.costPrice * it.quantity;
      totalItemsSold += it.quantity;
    }
  }

  const grossProfit = totalRevenue - totalCogs;

  return {
    date: startOfDay.toISOString().split("T")[0],
    totalTransactions: sales.length,
    totalRevenue,
    totalRevenueFormatted: formatRupiah(totalRevenue),
    totalCogs,
    grossProfit,
    grossProfitFormatted: formatRupiah(grossProfit),
    totalItemsSold,
  };
}

/**
 * 4. Get Sales by Date Range / Period
 */
export async function getSalesByDateRange(startDateStr: string, endDateStr?: string) {
  await connectToDatabase();
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  end.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } }).lean();

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalItemsSold = 0;

  for (const s of sales) {
    totalRevenue += s.total;
    for (const it of s.items) {
      totalCogs += it.costPrice * it.quantity;
      totalItemsSold += it.quantity;
    }
  }

  return {
    period: `${startDateStr} s/d ${endDateStr || "hari ini"}`,
    totalTransactions: sales.length,
    totalRevenue,
    totalRevenueFormatted: formatRupiah(totalRevenue),
    grossProfit: totalRevenue - totalCogs,
    grossProfitFormatted: formatRupiah(totalRevenue - totalCogs),
    totalItemsSold,
  };
}

/**
 * 5. Get Top Selling Products
 */
export async function getTopSellingProducts(limit: number = 5, period: string = "all") {
  await connectToDatabase();

  const filter: any = {};
  const now = new Date();
  if (period === "this_week") {
    const firstDay = new Date(now);
    firstDay.setDate(now.getDate() - now.getDay());
    firstDay.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: firstDay };
  } else if (period === "this_month") {
    filter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const sales = await Sale.find(filter).lean();
  const statsMap = new Map<string, { name: string; sku: string; totalSold: number; totalRevenue: number }>();

  for (const s of sales) {
    for (const it of s.items) {
      const pid = it.productId.toString();
      if (!statsMap.has(pid)) {
        statsMap.set(pid, {
          name: it.productName,
          sku: it.sku,
          totalSold: 0,
          totalRevenue: 0,
        });
      }
      const st = statsMap.get(pid)!;
      st.totalSold += it.quantity;
      st.totalRevenue += it.subtotal;
    }
  }

  const topList = Array.from(statsMap.values())
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      totalRevenueFormatted: formatRupiah(item.totalRevenue),
    }));

  return {
    period,
    topProducts: topList,
  };
}

/**
 * 6. Get Product Profit Breakdown
 */
export async function getProductProfit(period: string = "this_month") {
  await connectToDatabase();

  const filter: any = {};
  const now = new Date();
  if (period === "this_month") {
    filter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const sales = await Sale.find(filter).lean();
  const profitMap = new Map<string, { name: string; revenue: number; cogs: number; profit: number }>();

  for (const s of sales) {
    for (const it of s.items) {
      const pid = it.productId.toString();
      if (!profitMap.has(pid)) {
        profitMap.set(pid, { name: it.productName, revenue: 0, cogs: 0, profit: 0 });
      }
      const p = profitMap.get(pid)!;
      p.revenue += it.subtotal;
      p.cogs += it.costPrice * it.quantity;
      p.profit = p.revenue - p.cogs;
    }
  }

  const sorted = Array.from(profitMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)
    .map((it) => ({
      name: it.name,
      revenueFormatted: formatRupiah(it.revenue),
      cogsFormatted: formatRupiah(it.cogs),
      profitFormatted: formatRupiah(it.profit),
    }));

  return {
    period,
    topProfitProducts: sorted,
  };
}

/**
 * 7. Get Inventory Summary
 */
export async function getInventorySummary() {
  await connectToDatabase();

  const totalProducts = await Product.countDocuments({ isActive: true });
  const lowStockCount = await Product.countDocuments({
    isActive: true,
    $expr: { $lte: ["$stock", "$minimumStock"] },
  });
  const outOfStockCount = await Product.countDocuments({
    isActive: true,
    stock: { $lte: 0 },
  });

  const allProducts = await Product.find({ isActive: true }).select("stock costPrice").lean();
  let totalStockUnits = 0;
  let totalInventoryValuation = 0;

  for (const p of allProducts) {
    totalStockUnits += p.stock;
    totalInventoryValuation += p.stock * p.costPrice;
  }

  return {
    totalProducts,
    totalStockUnits,
    totalInventoryValuation,
    totalInventoryValuationFormatted: formatRupiah(totalInventoryValuation),
    lowStockCount,
    outOfStockCount,
  };
}
