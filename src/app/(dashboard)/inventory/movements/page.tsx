"use client";

import React, { useState, useEffect } from "react";
import { History } from "lucide-react";
import { IInventoryMovement } from "@/types";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function InventoryMovementsPage() {
  const { error: showError } = useToast();

  const [movements, setMovements] = useState<IInventoryMovement[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      const url =
        typeFilter === "all"
          ? "/api/inventory/movements"
          : `/api/inventory/movements?type=${typeFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.movements) setMovements(data.movements);
    } catch {
      showError("Gagal memuat riwayat mutasi stok.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Mutasi & Audit Stok Barang
          </h1>
          <p className="text-xs text-slate-500">
            Jejak audit lengkap setiap perubahan stok (Penjualan Kasir, Barang Masuk, dan Penyesuaian Fisik)
          </p>
        </div>

        {/* Filter Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua Mutasi
          </button>
          <button
            onClick={() => setTypeFilter("SALE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "SALE"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Penjualan (SALE)
          </button>
          <button
            onClick={() => setTypeFilter("STOCK_IN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "STOCK_IN"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Barang Masuk (STOCK_IN)
          </button>
          <button
            onClick={() => setTypeFilter("ADJUSTMENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "ADJUSTMENT"
                ? "bg-purple-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Penyesuaian (ADJUSTMENT)
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat riwayat audit mutasi...
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada riwayat pergerakan stok"
            description="Perubahan stok dari transaksi penjualan dan barang masuk akan otomatis tercatat di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4 text-center">Jenis Mutasi</th>
                  <th className="py-3 px-4 text-right">Perubahan Qty</th>
                  <th className="py-3 px-4 text-center">Stok (Sebelum → Sesudah)</th>
                  <th className="py-3 px-4">Keterangan / Ref</th>
                  <th className="py-3 px-4">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  const isNegative = m.quantity < 0;

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block text-xs">
                          {m.productName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {m.sku}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === "SALE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.type === "STOCK_IN"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-700"
                              : isNegative
                              ? "text-rose-600"
                              : "text-slate-600"
                          }
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-700 font-mono text-[11px]">
                        <span className="text-slate-400">{m.previousStock}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-bold text-slate-900">{m.newStock}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {m.note || m.referenceId || "-"}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {m.createdByName || "Sistem"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
