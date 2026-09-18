"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Boxes,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  History,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { IProduct, ISupplier } from "@/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StockBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function InventoryPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "owner";

  const { success, error: showError } = useToast();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Stock In Modal State
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [stockInForm, setStockInForm] = useState({
    productId: "",
    supplierId: "",
    quantity: "",
    purchasePrice: "",
    note: "",
  });
  const [isSubmittingStockIn, setIsSubmittingStockIn] = useState(false);

  // Stock Adjustment Modal State (Owner only)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: "",
    actualStock: "",
    reason: "",
  });
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, supRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/suppliers"),
      ]);
      const prodData = await prodRes.json();
      const supData = await supRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (supData.suppliers) setSuppliers(supData.suppliers);
    } catch {
      showError("Gagal memuat data inventori.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "low") {
        matchStatus = p.stock <= p.minimumStock && p.stock > 0;
      } else if (statusFilter === "out") {
        matchStatus = p.stock <= 0;
      } else if (statusFilter === "safe") {
        matchStatus = p.stock > p.minimumStock;
      }

      return matchSearch && matchStatus;
    });
  }, [products, search, statusFilter]);

  // Selected product for adjustment preview
  const selectedAdjustProduct = useMemo(() => {
    return products.find((p) => p._id === adjustForm.productId) || null;
  }, [products, adjustForm.productId]);

  const adjustDifference = useMemo(() => {
    if (!selectedAdjustProduct || adjustForm.actualStock === "") return 0;
    const actual = Number(adjustForm.actualStock);
    if (isNaN(actual)) return 0;
    return actual - selectedAdjustProduct.stock;
  }, [selectedAdjustProduct, adjustForm.actualStock]);

  // Open Stock In
  const handleOpenStockIn = (preselectedProductId?: string) => {
    setStockInForm({
      productId: preselectedProductId || products[0]?._id || "",
      supplierId: suppliers[0]?._id || "",
      quantity: "",
      purchasePrice: "",
      note: "",
    });
    setIsStockInOpen(true);
  };

  // Open Stock Adjustment
  const handleOpenAdjust = (preselectedProductId?: string) => {
    const prod = preselectedProductId
      ? products.find((p) => p._id === preselectedProductId)
      : products[0];

    setAdjustForm({
      productId: prod?._id || "",
      actualStock: prod ? String(prod.stock) : "",
      reason: "",
    });
    setIsAdjustOpen(true);
  };

  // Submit Stock In
  const handleSubmitStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStockIn(true);
    try {
      const payload = {
        productId: stockInForm.productId,
        supplierId: stockInForm.supplierId || undefined,
        quantity: Number(stockInForm.quantity),
        purchasePrice: stockInForm.purchasePrice
          ? Number(stockInForm.purchasePrice)
          : undefined,
        note: stockInForm.note,
      };

      const res = await fetch("/api/inventory/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses Stock In.");

      success(data.message || "Stok masuk berhasil dicatat.");
      setIsStockInOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat Stock In.");
    } finally {
      setIsSubmittingStockIn(false);
    }
  };

  // Submit Stock Adjustment
  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdjust(true);
    try {
      const payload = {
        productId: adjustForm.productId,
        actualStock: Number(adjustForm.actualStock),
        reason: adjustForm.reason,
      };

      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan penyesuaian stok.");

      success(data.message || "Penyesuaian stok berhasil disimpan.");
      setIsAdjustOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menyesuaikan stok.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Overview Counts
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock).length;
  const safeStockCount = products.filter((p) => p.stock > p.minimumStock).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inventori Stok Barang
          </h1>
          <p className="text-xs text-slate-500">
            Pantau status stok fisik, catat penerimaan barang masuk dari supplier, dan sesuaikan selisih stok
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Mutasi Stok</span>
          </Link>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAdjust()}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-600" />
              <span>Penyesuaian Fisik</span>
            </Button>
          )}

          <Button size="sm" onClick={() => handleOpenStockIn()}>
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
            <span>Stock In (Barang Masuk)</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Stok Aman</span>
            <p className="text-2xl font-bold text-emerald-800 font-mono tabular-nums mt-1">{safeStockCount}</p>
          </div>
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm">
            ✓
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Stok Menipis (Perlu Restock)</span>
            <p className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">{lowStockCount}</p>
          </div>
          <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-sm">
            !
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Stok Habis (Kosong)</span>
            <p className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">{outOfStockCount}</p>
          </div>
          <span className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold text-sm">
            ✕
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk atau SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter("safe")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "safe"
                ? "bg-emerald-700 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Aman
          </button>
          <button
            onClick={() => setStatusFilter("low")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "low"
                ? "bg-amber-600 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Menipis
          </button>
          <button
            onClick={() => setStatusFilter("out")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === "out"
                ? "bg-rose-600 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Habis (0)
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat data inventori...
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Tidak ada data produk yang cocok"
            description="Periksa kata kunci pencarian atau filter status stok Anda."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5">Nama Produk & SKU</th>
                  <th className="py-2.5 px-3.5">Kategori</th>
                  <th className="py-2.5 px-3.5 text-center">Stok Saat Ini</th>
                  <th className="py-2.5 px-3.5 text-center">Batas Minimum</th>
                  <th className="py-2.5 px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-3.5">
                      <span className="font-semibold text-slate-900 block text-xs">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {p.categoryName || "Umum"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center font-bold font-mono tabular-nums text-slate-900">
                      {p.stock}{" "}
                      <span className="text-slate-400 font-normal font-sans">{p.unit}</span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-slate-600">
                      {p.minimumStock}{" "}
                      <span className="text-slate-400 font-normal font-sans">{p.unit}</span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <StockBadge stock={p.stock} minimumStock={p.minimumStock} />
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStockIn(p._id)}
                          className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
                        >
                          + Stock In
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleOpenAdjust(p._id)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition-colors"
                          >
                            Sesuaikan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Stock In */}
      <Modal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        title="Penerimaan Barang Masuk (Stock In)"
        description="Tambahkan stok fisik produk yang diterima dari pemasok atau distributor."
        maxWidth="md"
      >
        <form onSubmit={handleSubmitStockIn} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Produk *
            </label>
            <select
              value={stockInForm.productId}
              onChange={(e) =>
                setStockInForm({ ...stockInForm, productId: e.target.value })
              }
              required
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Stok saat ini: {p.stock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supplier Pemasok (Opsional)
            </label>
            <select
              value={stockInForm.supplierId}
              onChange={(e) =>
                setStockInForm({ ...stockInForm, supplierId: e.target.value })
              }
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">Tanpa Supplier Khusus</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Jumlah Masuk *"
              type="number"
              min="1"
              step="1"
              placeholder="Contoh: 50"
              value={stockInForm.quantity}
              onChange={(e) =>
                setStockInForm({ ...stockInForm, quantity: e.target.value })
              }
              required
            />

            {isOwner && (
              <Input
                label="Harga Beli / Satuan (Rp)"
                type="number"
                min="0"
                step="100"
                placeholder="Perbarui harga modal jika ada"
                value={stockInForm.purchasePrice}
                onChange={(e) =>
                  setStockInForm({ ...stockInForm, purchasePrice: e.target.value })
                }
              />
            )}
          </div>

          <Input
            label="Catatan Pengiriman / No. Surat Jalan"
            placeholder="Contoh: Pengiriman rutin No. DO-9821"
            value={stockInForm.note}
            onChange={(e) => setStockInForm({ ...stockInForm, note: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStockInOpen(false)}
              disabled={isSubmittingStockIn}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmittingStockIn}>
              Simpan Stok Masuk
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Stock Adjustment (Owner Only) */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Penyesuaian Stok Fisik (Stock Adjustment)"
        description="Gunakan saat terjadi perbedaan antara stok tercatat di sistem dengan hitungan fisik riil di toko (misal barang rusak, hilang, atau kadaluwarsa)."
        maxWidth="md"
      >
        <form onSubmit={handleSubmitAdjust} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Produk *
            </label>
            <select
              value={adjustForm.productId}
              onChange={(e) =>
                setAdjustForm({
                  ...adjustForm,
                  productId: e.target.value,
                  actualStock: "",
                })
              }
              required
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedAdjustProduct && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Stok Sistem Saat Ini:</span>
                <span className="font-bold text-slate-900">
                  {selectedAdjustProduct.stock} {selectedAdjustProduct.unit}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Jumlah Stok Fisik Riil (Hasil Opname) *"
            type="number"
            min="0"
            step="1"
            placeholder="Masukkan hitungan fisik sesungguhnya"
            value={adjustForm.actualStock}
            onChange={(e) =>
              setAdjustForm({ ...adjustForm, actualStock: e.target.value })
            }
            required
          />

          {/* Selisih preview */}
          {selectedAdjustProduct && adjustForm.actualStock !== "" && (
            <div className="p-3 rounded-lg border text-xs flex justify-between items-center bg-slate-50 border-slate-200">
              <span className="font-medium text-slate-600">Selisih Penyesuaian:</span>
              <span
                className={`font-bold text-sm ${
                  adjustDifference > 0
                    ? "text-emerald-700"
                    : adjustDifference < 0
                    ? "text-rose-600"
                    : "text-slate-600"
                }`}
              >
                {adjustDifference > 0
                  ? `+${adjustDifference}`
                  : adjustDifference}{" "}
                {selectedAdjustProduct.unit}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan Penyesuaian (Wajib) *
            </label>
            <input
              type="text"
              placeholder="Contoh: Barang rusak saat display, selisih stock opname bulanan"
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value })
              }
              required
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustOpen(false)}
              disabled={isSubmittingAdjust}
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isSubmittingAdjust}
              disabled={adjustDifference === 0}
            >
              Simpan Penyesuaian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
