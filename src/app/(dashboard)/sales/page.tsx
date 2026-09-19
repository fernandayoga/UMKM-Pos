"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Printer, Eye, Calendar, CreditCard, Banknote, QrCode } from "lucide-react";
import { ISale, PaymentMethod } from "@/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function SalesHistoryPage() {
  const { error: showError } = useToast();

  const [sales, setSales] = useState<ISale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchInvoice, setSearchInvoice] = useState("");
  const [period, setPeriod] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("");

  // Detail Modal
  const [selectedSale, setSelectedSale] = useState<ISale | null>(null);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchInvoice.trim()) params.append("search", searchInvoice.trim());
      if (period !== "all") params.append("period", period);
      if (paymentMethod) params.append("paymentMethod", paymentMethod);

      const res = await fetch(`/api/sales?${params.toString()}`);
      const data = await res.json();
      if (data.sales) setSales(data.sales);
    } catch {
      showError("Gagal memuat riwayat transaksi penjualan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [period, paymentMethod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSales();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Riwayat Penjualan
          </h1>
          <p className="text-xs text-slate-500">
            Daftar transaksi penjualan kasir, rincian nota belanja, dan cetak ulang struk pembayaran
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center justify-between shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor invoice (INV-...)"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="this_week">Minggu Ini</option>
            <option value="this_month">Bulan Ini</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">Semua Metode</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat riwayat transaksi...
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi penjualan"
            description="Transaksi yang dilakukan melalui halaman Kasir (POS) akan otomatis muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5">No. Invoice</th>
                  <th className="py-2.5 px-3.5">Waktu Transaksi</th>
                  <th className="py-2.5 px-3.5">Kasir</th>
                  <th className="py-2.5 px-3.5">Item Belanja</th>
                  <th className="py-2.5 px-3.5 text-center">Metode Bayar</th>
                  <th className="py-2.5 px-3.5 text-right">Total Transaksi</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {s.invoiceNumber}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                      {s.cashierName}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">
                      {s.items.map((it) => `${it.productName} (${it.quantity})`).join(", ")}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          s.paymentMethod === "cash"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : s.paymentMethod === "qris"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {s.paymentMethod}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-bold font-mono tabular-nums text-slate-900 text-xs">
                      {formatRupiah(s.total)}
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedSale(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail Nota</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail / Receipt Modal */}
      <Modal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title="Detail Nota Penjualan"
        maxWidth="sm"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div
              id="printable-receipt"
              className="p-4 bg-white border border-dashed border-slate-300 rounded-lg font-mono text-xs text-slate-800 space-y-2.5 leading-relaxed"
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm tracking-tight text-slate-900 uppercase">
                  TOKO MAJU JAYA
                </p>
                <p className="text-[10px] text-slate-500">
                  Surabaya, Jawa Timur - Indonesia
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {selectedSale.invoiceNumber}
                </p>
                <p className="text-[10px] text-slate-500">
                  Kasir: {selectedSale.cashierName} • {formatDate(selectedSale.createdAt)}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300 text-[11px]">
                {selectedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <span>{it.productName}</span>
                      <span className="text-slate-500 block text-[10px]">
                        {it.quantity} × {formatRupiah(it.sellingPrice)}
                      </span>
                    </div>
                    <span className="font-semibold">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar ({selectedSale.paymentMethod === "cash" ? "Tunai" : selectedSale.paymentMethod}):</span>
                  <span>{formatRupiah(selectedSale.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembali:</span>
                  <span>{formatRupiah(selectedSale.changeAmount)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p>Terima kasih atas kunjungan Anda 🙏</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSale(null)}
              >
                Tutup
              </Button>
              <div title="Integrasi printer thermal (Bluetooth/USB) segera hadir" className="cursor-not-allowed">
                <Button
                  size="sm"
                  disabled
                  variant="outline"
                  className="text-slate-400 border-slate-200 bg-slate-50 font-medium cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>Cetak Nota (Segera Hadir)</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
