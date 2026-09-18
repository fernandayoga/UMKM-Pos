"use client";

import React, { useState, useEffect, useMemo } from "react";
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

  // Ensure both grossProfit and profit are available for the chart
  const normalizedChartData = useMemo(() => {
    return chartData.map((item) => ({
      ...item,
      grossProfit: item.grossProfit ?? item.profit ?? 0,
    }));
  }, [chartData]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Total Pendapatan (Omzet)
          </span>
          <p className="text-2xl font-extrabold text-slate-900 my-1.5 tracking-tight font-mono tabular-nums">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium font-mono tabular-nums">
            {summary.totalTransactions} transaksi berhasil
          </span>
        </div>

        {/* Total COGS */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Harga Pokok Penjualan (HPP / COGS)
          </span>
          <p className="text-2xl font-extrabold text-slate-600 my-1.5 tracking-tight font-mono tabular-nums">
            {formatRupiah(summary.totalCogs)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Total modal barang terjual
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Laba Kotor (Gross Profit)
          </span>
          <p className="text-2xl font-extrabold text-emerald-800 my-1.5 tracking-tight font-mono tabular-nums">
            {formatRupiah(summary.grossProfit)}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold font-mono tabular-nums">
            Margin: {summary.profitMarginPercent}%
          </span>
        </div>

        {/* Items Sold */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">
            Total Produk Terjual
          </span>
          <p className="text-2xl font-extrabold text-emerald-800 my-1.5 tracking-tight font-mono tabular-nums">
            {summary.totalItemsSold} pcs
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Kuantitas item keluar
          </span>
        </div>
      </div>

      {/* Chart: Daily Revenue & Gross Profit */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
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
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={normalizedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  formatter={(value: any, name: any) => [
                    formatRupiah(Number(value)),
                    name === "revenue" ? "Omzet Penjualan" : "Laba Kotor",
                  ]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  formatter={(value) => (value === "revenue" ? "Omzet Penjualan" : "Laba Kotor")}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar dataKey="revenue" fill="#2563eb" name="revenue" radius={[3, 3, 0, 0]} />
                <Bar dataKey="grossProfit" fill="#10b981" name="grossProfit" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product Performance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Top Selling Products */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
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
                <div key={p.productId} className="py-2 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <span className="font-bold text-emerald-800 font-mono tabular-nums shrink-0">
                    {p.totalSold} terjual
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Revenue Products */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
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
                <div key={p.productId} className="py-2 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">{p.totalSold} terjual</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums shrink-0">
                    {formatRupiah(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Profit Products */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
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
                <div key={p.productId} className="py-2 flex justify-between items-center">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 block truncate">
                      {idx + 1}. {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">{p.totalSold} pcs</span>
                  </div>
                  <span className="font-bold text-emerald-800 font-mono tabular-nums shrink-0">
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
