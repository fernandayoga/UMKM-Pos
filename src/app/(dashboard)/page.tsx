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
  Cell,
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

       
      </div>

      {/* 1. Kondisi Bisnis Hari Ini (Priority 1) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Overview Kondisi Bisnis
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Sales */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Penjualan (Omzet)</span>
            <div className="my-2">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                {formatRupiah(summary.totalRevenue)}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium font-mono tabular-nums">
              {summary.totalTransactions} transaksi berhasil
            </span>
          </div>

          {/* Transactions */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Jumlah Transaksi</span>
            <div className="my-2">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                {summary.totalTransactions}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Kunjungan kasir
            </span>
          </div>

          {/* Items Sold */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">Produk Terjual</span>
            <div className="my-2">
              <p className="text-2xl font-extrabold text-emerald-800 tracking-tight font-mono tabular-nums">
                {summary.totalItemsSold} pcs
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Total fisik barang keluar
            </span>
          </div>

          {/* Gross Profit (Owner only or Cashier info) */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-semibold tracking-wide">
              {isOwner ? "Laba Kotor (Gross Profit)" : "Produk Stok Rendah"}
            </span>
            <div className="my-2">
              <p
                className={`text-2xl font-extrabold tracking-tight font-mono tabular-nums ${
                  isOwner ? "text-emerald-800" : "text-amber-600"
                }`}
              >
                {isOwner
                  ? formatRupiah(summary.grossProfit)
                  : `${summary.lowStockCount} Produk`}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium font-mono tabular-nums">
              {isOwner
                ? `Margin: ${summary.profitMarginPercent}%`
                : "Memerlukan restock"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sales Performance & Top Products (Priority 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sales Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
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
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setPeriod("this_week")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === "this_week"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setPeriod("this_month")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === "this_month"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
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
                  <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry: any, index: number) => {
                      let fill = "#10b981"; // Default Emerald
                      const maxVal = Math.max(...chartData.map((d: any) => d.revenue));
                      if (maxVal > 0) {
                        if (entry.revenue <= maxVal * 0.3) fill = "#f43f5e"; // Rose for low
                        else if (entry.revenue <= maxVal * 0.65) fill = "#f59e0b"; // Amber for medium
                        else fill = "#047857"; // Deep emerald for high
                      }
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Products (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              5 Produk Terlaris
            </h3>
            <Link
              href="/reports"
              className="text-[11px] font-semibold text-emerald-700 hover:underline"
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
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <span className="font-bold text-emerald-800 font-mono tabular-nums shrink-0">
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
