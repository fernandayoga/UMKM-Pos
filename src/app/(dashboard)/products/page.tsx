"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { IProduct, ICategory, ProductUnit } from "@/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { StockBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function ProductsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "cashier";
  const isOwner = userRole === "owner";

  const { success, error: showError } = useToast();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState("name_asc");

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    description: "",
    costPrice: "",
    sellingPrice: "",
    stock: "",
    minimumStock: "5",
    unit: "pcs" as ProductUnit,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Dialog state
  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (catData.categories) setCategories(catData.categories);
    } catch {
      showError("Gagal mengambil data produk.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase());

        const catId =
          typeof p.categoryId === "object" ? (p.categoryId as any)._id : p.categoryId;
        const matchCat = selectedCategory === "all" || catId === selectedCategory;

        const matchStock = filterLowStock ? p.stock <= p.minimumStock : true;

        return matchSearch && matchCat && matchStock;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "stock_asc") return a.stock - b.stock;
        if (sortBy === "stock_desc") return b.stock - a.stock;
        if (sortBy === "price_asc") return a.sellingPrice - b.sellingPrice;
        if (sortBy === "price_desc") return b.sellingPrice - a.sellingPrice;
        return 0;
      });
  }, [products, search, selectedCategory, filterLowStock, sortBy]);

  // Open Form Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      categoryId: categories[0]?._id || "",
      description: "",
      costPrice: "",
      sellingPrice: "",
      stock: "0",
      minimumStock: "5",
      unit: "pcs",
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: IProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      categoryId:
        typeof p.categoryId === "object" ? (p.categoryId as any)._id : p.categoryId,
      description: p.description || "",
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      stock: String(p.stock),
      minimumStock: String(p.minimumStock),
      unit: p.unit,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Submit Product
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const costPrice = Number(formData.costPrice);
    const sellingPrice = Number(formData.sellingPrice);

    if (sellingPrice < costPrice) {
      if (
        !window.confirm(
          `Peringatan: Harga jual (${formatRupiah(
            sellingPrice
          )}) lebih rendah daripada harga modal (${formatRupiah(
            costPrice
          )}). Tetap simpan?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct._id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const payload = {
        name: formData.name,
        sku: formData.sku,
        categoryId: formData.categoryId,
        description: formData.description,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minimumStock: Number(formData.minimumStock),
        unit: formData.unit,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan produk.");
      }

      success(
        editingProduct
          ? "Data produk berhasil diperbarui."
          : "Produk baru berhasil ditambahkan."
      );
      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus produk.");
      }

      success(data.message || "Produk berhasil dihapus.");
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menghapus produk.");
    } finally {
      setIsDeleting(false);
    }
  };

  const safeStockCount = products.filter((p) => p.stock > p.minimumStock).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const totalHpp = products.reduce((acc, p) => acc + p.costPrice * p.stock, 0);
  const totalEstOmzet = products.reduce((acc, p) => acc + p.sellingPrice * p.stock, 0);

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0f5b53]">Katalog SKU & Stok Opname</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-400">Terakhir disinkronkan: 2 menit lalu</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Produk & Inventori
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola master produk, harga beli/jual, barcode SKU, dan batas minimum stok toko dalam satu tampilan kerja terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => success("Fitur ekspor CSV / Excel disiapkan.")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Ekspor Data
          </button>
          <button
            onClick={() => success("Format file impor massal telah siap.")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Impor Massal
          </button>
          {isOwner && (
            <Button onClick={handleOpenAdd} size="sm" className="bg-[#0f5b53] hover:bg-[#0c4e47] text-white">
              <Plus className="w-4 h-4 mr-1" />
              <span>+ Tambah Produk Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. 5 Metric Cards Strip (from Reference Image 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total Produk */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Total Produk Aktif</span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900">{products.length}</span>
            <span className="text-[10px] text-slate-400 ml-1.5">SKU terdaftar</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-800 rounded-full w-full" />
          </div>
        </div>

        {/* Metric 2: Stok Aman */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Stok Aman</span>
            <span className="text-[10px] text-emerald-600 font-bold">✓</span>
          </div>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900">{safeStockCount}</span>
            <span className="text-[10px] text-emerald-600 font-medium ml-1.5">
              {products.length > 0 ? Math.round((safeStockCount / products.length) * 100) : 100}%
            </span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0f5b53] rounded-full"
              style={{ width: `${products.length > 0 ? (safeStockCount / products.length) * 100 : 100}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Stok Menipis */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Stok Menipis</span>
            <span className="text-[10px] text-amber-600 font-bold">!</span>
          </div>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900">{lowStockCount}</span>
            <span className="text-[10px] text-amber-600 font-medium ml-1.5">Perlu reorder</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${products.length > 0 ? (lowStockCount / products.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Habis / Kosong */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Habis / Kosong</span>
            <span className="text-[10px] text-rose-600 font-bold">✕</span>
          </div>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900">{outOfStockCount}</span>
            <span className="text-[10px] text-rose-600 font-medium ml-1.5">Kritis</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${products.length > 0 ? (outOfStockCount / products.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 5: Nilai Inventori (HPP) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-3 lg:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium">Nilai Inventori (HPP)</span>
          <div className="my-1.5">
            <span className="text-lg font-black text-slate-900 block truncate">
              {formatRupiah(totalHpp)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              Est. Omzet {formatRupiah(totalEstOmzet)}
            </span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full w-4/5" />
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f5b53] focus:bg-white transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f5b53]"
            >
              <option value="all">Semua Kategori (Semua)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="w-full sm:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f5b53]"
            >
              <option value="name_asc">Nama (A - Z)</option>
              <option value="name_desc">Nama (Z - A)</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="stock_asc">Stok Tersedikit</option>
              <option value="stock_desc">Stok Terbanyak</option>
            </select>
          </div>
        </div>

        {/* Low Stock Quick Filter */}
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`h-9 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors shrink-0 ${
            filterLowStock
              ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Hanya Stok Menipis</span>
        </button>
      </div>

      {/* 4. Product Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat master produk...
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tidak ada produk ditemukan"
            description={
              search || selectedCategory !== "all" || filterLowStock
                ? "Cobalah mengatur ulang pencarian atau filter yang dipilih."
                : "Mulai kelola usaha toko Anda dengan menambahkan produk pertama."
            }
            actionLabel={isOwner && !search ? "+ Tambah Produk" : undefined}
            onAction={isOwner && !search ? handleOpenAdd : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">PRODUK & BARCODE</th>
                  <th className="py-3 px-4">KATEGORI</th>
                  {isOwner && <th className="py-3 px-4 text-right">HARGA MODAL (HPP)</th>}
                  <th className="py-3 px-4 text-right">HARGA JUAL</th>
                  {isOwner && <th className="py-3 px-4 text-center">MARGIN</th>}
                  <th className="py-3 px-4 text-center">STOK SAAT INI</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  {isOwner && <th className="py-3 px-4 text-right">AKSI</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const marginPercent = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              SKU: {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {p.categoryName || "Retail"}
                        </span>
                      </td>

                      {isOwner && (
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-xs">
                          {formatRupiah(p.costPrice)}
                        </td>
                      )}

                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                        {formatRupiah(p.sellingPrice)}
                      </td>

                      {isOwner && (
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            marginPercent >= 20
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : marginPercent > 0
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            +{marginPercent}%
                          </span>
                        </td>
                      )}

                      <td className="py-3 px-4 text-center">
                        <span className="font-black text-slate-900 text-xs block">
                          {p.stock}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          min {p.minimumStock} {p.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <StockBadge
                          stock={p.stock}
                          minimumStock={p.minimumStock}
                        />
                      </td>

                      {isOwner && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-slate-400 hover:text-[#0f5b53] hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Bottom 3 Advisory Cards (from Reference Image 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-2xs">
          <span className="text-xs font-bold text-slate-900 block mb-1">
            Peringatan Reorder Cepat
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {lowStockCount + outOfStockCount} produk berstatus kritis/menipis dapat menyebabkan potensi kehilangan transaksi harian.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-100 bg-teal-50/20 shadow-2xs">
          <span className="text-xs font-bold text-slate-900 block mb-1">
            Margin Terbaik Toko
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Kategori fast-moving membukukan margin laba kotor rata-rata 25% dengan perputaran tercepat.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 bg-slate-50/40 shadow-2xs">
          <span className="text-xs font-bold text-slate-900 block mb-1">
            Integrasi Barcode Scanner
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Gunakan barcode scanner USB/Bluetooth langsung di halaman POS untuk checkout instan tanpa mengetik nama produk.
          </p>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? "Edit Informasi Produk" : "Tambah Produk Baru"}
        description="Lengkapi detail informasi barang dagangan toko di bawah ini."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Produk *"
              placeholder="Contoh: Indomie Goreng"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="SKU / Kode Barang"
              placeholder="Otomatis jika dikosongkan"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Produk *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="" disabled>
                  Pilih Kategori
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Satuan Barang *
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value as ProductUnit })
                }
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="pcs">pcs (buah / biji)</option>
                <option value="box">box (kotak / kardus)</option>
                <option value="kg">kg (kilogram)</option>
                <option value="liter">liter</option>
                <option value="bottle">bottle (botol)</option>
                <option value="pack">pack (bungkus)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Harga Modal (HPP) *"
              type="number"
              min="0"
              step="100"
              placeholder="2500"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              required
            />

            <Input
              label="Harga Jual *"
              type="number"
              min="0"
              step="100"
              placeholder="3500"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingProduct ? (
              <Input
                label="Stok Awal"
                type="number"
                min="0"
                placeholder="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            ) : (
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-slate-700">
                  Stok Saat Ini
                </label>
                <div className="h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center">
                  {formData.stock} {formData.unit}
                </div>
                <p className="text-[10px] text-slate-400">
                  Perubahan stok hanya dapat dilakukan melalui menu Inventori (Stock In / Penyesuaian).
                </p>
              </div>
            )}

            <Input
              label="Batas Minimum Stok *"
              type="number"
              min="0"
              placeholder="5"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              required
              helperText="Sistem akan memberi peringatan jika stok berada di atau di bawah batas ini."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Hapus Produk?"
        message={`Produk "${productToDelete?.name}" (${productToDelete?.sku}) akan dihapus. Jika produk sudah pernah memiliki riwayat transaksi penjualan, produk akan dinonaktifkan agar integritas laporan keuangan tetap terjaga.`}
        confirmText="Hapus Produk"
        isLoading={isDeleting}
      />
    </div>
  );
}
