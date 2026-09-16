"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Plus,
  Store,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatRupiah } from "@/lib/utils";
import { StockBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "owner";

  const { error: showError } = useToast();

  const [period, setPeriod] = useState("this_week");
  const [isLoading, setIsLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    profitMarginPercent: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
    lowStockCount: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [bestSelling, setBestSelling] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, lowStockRes] = await Promise.all([
        fetch(`/api/reports?period=${period}`),
        fetch("/api/products?lowStock=true"),
      ]);

      const reportData = await reportRes.json();
      const lowStockData = await lowStockRes.json();

      if (reportData.summary) setSummary(reportData.summary);
      if (reportData.chartData) setChartData(reportData.chartData);
      if (reportData.bestSellingProducts) setBestSelling(reportData.bestSellingProducts);
      if (lowStockData.products) setLowStockProducts(lowStockData.products);
    } catch {
      showError("Gagal memuat ringkasan data dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Ringkasan Bisnis Toko
          </h1>
          <p className="text-xs text-slate-500">
            Kondisi penjualan hari ini, perhatian stok produk, dan performa transaksi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Buka Kasir (POS)</span>
          </Link>
        </div>
      </div>

      {/* 1. Kondisi Bisnis Hari Ini (Priority 1) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Overview Kondisi Bisnis
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Sales */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Penjualan (Omzet)</span>
            <div className="my-2">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(summary.totalRevenue)}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {summary.totalTransactions} transaksi berhasil
            </span>
          </div>

          {/* Transactions */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Jumlah Transaksi</span>
            <div className="my-2">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {summary.totalTransactions}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Kunjungan kasir
            </span>
          </div>

          {/* Items Sold */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Produk Terjual</span>
            <div className="my-2">
              <p className="text-2xl font-black text-blue-700 tracking-tight">
                {summary.totalItemsSold} pcs
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Total fisik barang keluar
            </span>
          </div>

          {/* Gross Profit (Owner only or Cashier info) */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">
              {isOwner ? "Laba Kotor (Gross Profit)" : "Produk Stok Rendah"}
            </span>
            <div className="my-2">
              <p
                className={`text-2xl font-black tracking-tight ${
                  isOwner ? "text-emerald-700" : "text-amber-600"
                }`}
              >
                {isOwner
                  ? formatRupiah(summary.grossProfit)
                  : `${summary.lowStockCount} Produk`}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {isOwner
                ? `Margin: ${summary.profitMarginPercent}%`
                : "Memerlukan restock"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Attention Needed: Low Stock Products (Priority 2) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-300 shadow-[0_3px_14px_rgba(217,119,6,0.09),0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6 mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Perhatian: {lowStockProducts.length} Produk Menipis atau Habis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stok barang ini berada di bawah batas aman minimum. Segera buat Stock In dari supplier.
                </p>
              </div>
            </div>

            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
            >
              <span>Buka Inventori</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 pt-4">
            {lowStockProducts.slice(0, 6).map((p) => (
              <div
                key={p._id}
                className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/30 hover:bg-white hover:border-amber-400 hover:shadow-md transition-all flex items-center justify-between text-xs"
              >
                <div className="truncate pr-3">
                  <span className="font-semibold text-slate-900 block truncate text-xs">
                    {p.name}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Sisa: <strong className="text-amber-700 font-bold">{p.stock}</strong> / min {p.minimumStock} {p.unit}
                  </span>
                </div>
                <StockBadge stock={p.stock} minimumStock={p.minimumStock} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Sales Performance & Top Products (Priority 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sales Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Grafik Penjualan Harian
              </h3>
              <p className="text-xs text-slate-500">
                Omzet transaksi penjualan toko
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs border border-slate-200">
              <button
                onClick={() => setPeriod("today")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === "today"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setPeriod("this_week")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === "this_week"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setPeriod("this_month")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === "this_month"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat grafik...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Belum ada transaksi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value)), "Omzet"]}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Products (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              5 Produk Terlaris
            </h3>
            <Link
              href="/reports"
              className="text-[11px] font-semibold text-blue-600 hover:underline"
            >
              Semua
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs mt-2">
            {bestSelling.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs">
                Belum ada data penjualan tercatat.
              </p>
            ) : (
              bestSelling.map((p, idx) => (
                <div key={p.productId} className="py-2.5 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.sku}</span>
                  </div>
                  <span className="font-bold text-blue-700 shrink-0">
                    {p.totalSold} pcs
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
