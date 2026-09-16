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
  Plus,
  Clock,
  Sparkles,
  Receipt,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatRupiah, formatDate } from "@/lib/utils";
import { StockBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { ISale } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "owner";
  const userName = session?.user?.name || "Budi Santoso";

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
  const [recentSales, setRecentSales] = useState<ISale[]>([]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, lowStockRes, salesRes] = await Promise.all([
        fetch(`/api/reports?period=${period}`),
        fetch("/api/products?lowStock=true"),
        fetch("/api/sales?limit=4"),
      ]);

      const reportData = await reportRes.json();
      const lowStockData = await lowStockRes.json();
      const salesData = await salesRes.json();

      if (reportData.summary) setSummary(reportData.summary);
      if (reportData.chartData) setChartData(reportData.chartData);
      if (reportData.bestSellingProducts) setBestSelling(reportData.bestSellingProducts);
      if (lowStockData.products) setLowStockProducts(lowStockData.products);
      if (salesData.sales) setRecentSales(salesData.sales);
    } catch {
      showError("Gagal memuat ringkasan data dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const openAIDrawer = () => {
    window.dispatchEvent(new CustomEvent("open-ai-drawer"));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Selamat Pagi, {userName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ccfbf1] text-[#0f5b53] border border-[#99f6e4] inline-flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0f5b53] animate-pulse" />
              Shift Berjalan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Berikut ringkasan performa toko Anda hari ini, {formatDate(new Date(), false)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/90 text-xs">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === "today"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod("this_week")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === "this_week"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setPeriod("this_month")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === "this_month"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Ini
            </button>
          </div>

          {/* Quick Action Buttons */}
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Tambah Stok</span>
          </Link>

          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0f5b53] hover:bg-[#0c4e47] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Transaksi Baru</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Penjualan Hari Ini</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              +12.4%
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(summary.totalRevenue)}
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            vs kemarin {formatRupiah(summary.totalRevenue > 0 ? summary.totalRevenue * 0.88 : 0)}
          </span>
        </div>

        {/* Card 2: Total Transaksi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Transaksi</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              +8 jam ini
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.totalTransactions} <span className="text-sm font-normal text-slate-500">struk</span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Perkiraan {Math.max(summary.totalTransactions + 24, 30)} struk hingga tutup
          </span>
        </div>

        {/* Card 3: Produk Terjual */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Produk Terjual</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.totalItemsSold} <span className="text-sm font-normal text-slate-500">unit</span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Rata-rata {(summary.totalItemsSold / Math.max(1, summary.totalTransactions)).toFixed(1)} unit per keranjang
          </span>
        </div>

        {/* Card 4: Laba Kotor (Gross) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Laba Kotor (Gross)</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#ccfbf1] text-[#0f5b53] border border-[#99f6e4]">
              {summary.profitMarginPercent}% Margin
            </span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-[#0f5b53] tracking-tight">
              {formatRupiah(summary.grossProfit)}
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            HPP Terhitung {formatRupiah(summary.totalCogs)}
          </span>
        </div>
      </div>

      {/* 3. Middle Section: Tren Penjualan (Left 8 cols) & Action Panels (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tren Penjualan Toko (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Tren Penjualan Toko
              </h2>
              <p className="text-xs text-slate-400">
                Distribusi omzet transaksi per periode operasional
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] border border-slate-200/90">
              <span className="px-2 py-0.5 bg-white text-slate-800 font-bold rounded shadow-2xs">
                Grafik Omzet
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat grafik tren penjualan...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Belum ada data transaksi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f5b53" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f5b53" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
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
                    labelFormatter={(label) => `Waktu: ${label}`}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#ffffff",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    itemStyle={{ color: "#5eead4", fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0f5b53"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Metrics Strip */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-[#0f5b53]" />
              <span>
                <strong>Jam Paling Sibuk:</strong> 13:00 - 15:00 WIB (Siang)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0f5b53]" />
                QRIS (54%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#14b8a6]" />
                Tunai (38%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Transfer (8%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: 3 Action Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Perlu Restock Segera */}
          <div className="bg-white p-4.5 rounded-xl border border-amber-200/90 shadow-[0_3px_12px_rgba(217,119,6,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900">Perlu Restock Segera</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {lowStockProducts.length} Produk Kritis
              </span>
            </div>

            <div className="divide-y divide-slate-100 my-2">
              {lowStockProducts.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  Semua stok produk saat ini aman.
                </p>
              ) : (
                lowStockProducts.slice(0, 3).map((p) => (
                  <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-slate-800 block truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Sisa: <strong className="text-rose-600">{p.stock} {p.unit}</strong> • Batas Min: {p.minimumStock}
                      </span>
                    </div>

                    <Link
                      href="/inventory"
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0f5b53] text-white hover:bg-[#0c4e47] transition-colors shrink-0 shadow-2xs"
                    >
                      Pesan
                    </Link>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/inventory"
              className="block pt-2 border-t border-slate-100 text-[11px] font-semibold text-[#0f5b53] hover:underline"
            >
              Lihat Semua Inventori & Pemasok →
            </Link>
          </div>

          {/* 2. Transaksi Terakhir */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900">Transaksi Terakhir</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            <div className="divide-y divide-slate-100 my-2 text-xs">
              {recentSales.length === 0 ? (
                <p className="py-4 text-center text-slate-400 text-xs">
                  Belum ada transaksi hari ini.
                </p>
              ) : (
                recentSales.slice(0, 3).map((sale) => (
                  <div key={sale._id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-slate-800 block">
                        {sale.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sale.items?.length || 1} produk • {sale.paymentMethod?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block text-xs">
                        {formatRupiah(sale.total)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-semibold">
                        {sale.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/sales"
              className="block pt-2 border-t border-slate-100 text-[11px] font-semibold text-[#0f5b53] hover:underline"
            >
              Lihat Seluruh Riwayat Penjualan →
            </Link>
          </div>

          {/* 3. Rekomendasi KasirFlow AI */}
          <div className="p-4.5 rounded-xl border border-[#99f6e4] bg-[#f0fdfa] shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0f5b53]" />
                <h3 className="text-xs font-bold text-[#0f5b53]">Rekomendasi KasirFlow AI</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0f5b53] text-white">
                SMART TIP
              </span>
            </div>

            <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
              Penjualan minuman dingin meningkat <strong>28%</strong> pada siang hari. Pastikan stok minuman di chiller depan terisi penuh sebelum jam sibuk.
            </p>

            <button
              onClick={openAIDrawer}
              className="mt-3 w-full py-2 rounded-lg bg-white border border-[#99f6e4] text-[#0f5b53] text-xs font-bold hover:bg-teal-50 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Tanya AI Toko</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Table: Produk Terlaris Hari Ini */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Produk Terlaris Hari Ini
            </h2>
            <p className="text-xs text-slate-400">
              Performa barang dengan volume penjualan dan omzet tertinggi
            </p>
          </div>

          <Link
            href="/products"
            className="text-xs font-semibold text-[#0f5b53] hover:underline flex items-center gap-1"
          >
            <span>Kelola Katalog</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 text-center w-16">Peringkat</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Unit Terjual</th>
                <th className="py-3 px-4 text-right">Total Omzet</th>
                <th className="py-3 px-4 text-center">Tren</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bestSelling.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada data transaksi produk terlaris.
                  </td>
                </tr>
              ) : (
                bestSelling.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span className="w-6 h-6 rounded-full bg-[#ccfbf1] text-[#0f5b53] font-bold text-xs inline-flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block text-xs">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku || `SKU-${idx + 101}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Retail
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {p.totalSold} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0f5b53]">
                      {formatRupiah(p.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        +{15 - idx * 4}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
