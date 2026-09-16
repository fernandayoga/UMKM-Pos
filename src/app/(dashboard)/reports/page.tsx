"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function ReportsPage() {
  const { error: showError } = useToast();

  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    profitMarginPercent: 0,
    totalTransactions: 0,
    totalItemsSold: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<any[]>([]);
  const [highestRevenueProducts, setHighestRevenueProducts] = useState<any[]>([]);
  const [highestProfitProducts, setHighestProfitProducts] = useState<any[]>([]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "custom") {
        params.append("period", period);
      } else if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();

      if (data.summary) setSummary(data.summary);
      if (data.chartData) setChartData(data.chartData);
      if (data.bestSellingProducts) setBestSellingProducts(data.bestSellingProducts);
      if (data.highestRevenueProducts) setHighestRevenueProducts(data.highestRevenueProducts);
      if (data.highestProfitProducts) setHighestProfitProducts(data.highestProfitProducts);
    } catch {
      showError("Gagal memuat laporan laba rugi toko.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (period !== "custom" || (startDate && endDate)) {
      loadReport();
    }
  }, [period, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Finansial & Laba Kotor
          </h1>
          <p className="text-xs text-slate-500">
            Analisis omzet penjualan, estimasi laba kotor (Revenue - COGS), dan performa produk bisnis
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "today"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod("this_week")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "this_week"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setPeriod("this_month")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "this_month"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriod("custom")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === "custom"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kustom
            </button>
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2 rounded border border-slate-300 bg-white text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2 rounded border border-slate-300 bg-white text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Financial Overview Strip (neutral-first, anti-slop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Total Pendapatan (Omzet)
          </span>
          <p className="text-2xl font-black text-slate-900 my-1.5 tracking-tight">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            {summary.totalTransactions} transaksi berhasil
          </span>
        </div>

        {/* Total COGS */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Harga Pokok Penjualan (HPP / COGS)
          </span>
          <p className="text-2xl font-black text-slate-600 my-1.5 tracking-tight">
            {formatRupiah(summary.totalCogs)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Total modal barang terjual
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Laba Kotor (Gross Profit)
          </span>
          <p className="text-2xl font-black text-emerald-700 my-1.5 tracking-tight">
            {formatRupiah(summary.grossProfit)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            Margin: {summary.profitMarginPercent}%
          </span>
        </div>

        {/* Items Sold */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Total Produk Terjual
          </span>
          <p className="text-2xl font-black text-blue-700 my-1.5 tracking-tight">
            {summary.totalItemsSold} pcs
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Kuantitas item keluar
          </span>
        </div>
      </div>

      {/* Chart: Daily Revenue & Gross Profit */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Tren Pendapatan & Laba Kotor Harian
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan omzet penjualan kotor dengan estimasi laba kotor harian
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Menyiapkan grafik...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            Belum ada data penjualan pada periode yang dipilih.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  formatter={(value: any) => [formatRupiah(Number(value)), ""]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  formatter={(value) =>
                    value === "revenue" ? "Omzet Penjualan" : "Laba Kotor"
                  }
                />
                <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product Performance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-xs font-bold text-slate-900 mb-1">
            Produk Terlaris (Kuantitas)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Berdasarkan total unit terjual
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {bestSellingProducts.length === 0 ? (
              <p className="py-4 text-center text-slate-400 text-[11px]">
                Belum ada data
              </p>
            ) : (
              bestSellingProducts.map((p, idx) => (
                <div key={p.productId} className="py-2.5 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <span className="font-bold text-blue-700 shrink-0">
                    {p.totalSold} terjual
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Revenue Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-xs font-bold text-slate-900 mb-1">
            Kontributor Omzet Terbesar
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Berdasarkan total nilai transaksi penjualan
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {highestRevenueProducts.length === 0 ? (
              <p className="py-4 text-center text-slate-400 text-[11px]">
                Belum ada data
              </p>
            ) : (
              highestRevenueProducts.map((p, idx) => (
                <div key={p.productId} className="py-2.5 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.totalSold} terjual</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatRupiah(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Profit Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
          <h3 className="text-xs font-bold text-slate-900 mb-1">
            Penyumbang Laba Terbesar
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Berdasarkan selisih harga jual dan modal (Gross Profit)
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {highestProfitProducts.length === 0 ? (
              <p className="py-4 text-center text-slate-400 text-[11px]">
                Belum ada data
              </p>
            ) : (
              highestProfitProducts.map((p, idx) => (
                <div key={p.productId} className="py-2.5 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.totalSold} pcs</span>
                  </div>
                  <span className="font-bold text-emerald-700 shrink-0">
                    +{formatRupiah(p.profit)}
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
