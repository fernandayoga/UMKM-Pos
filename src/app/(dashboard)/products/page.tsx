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
    image: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
    setSelectedImage(null);
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
      image: "",
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: IProduct) => {
    setEditingProduct(p);
    setSelectedImage(null);
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
      image: p.image || "",
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
      let finalImageUrl = formData.image;

      if (selectedImage) {
        setIsUploadingImage(true);
        const uploadData = new FormData();
        uploadData.append("file", selectedImage);
        uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: uploadData,
        });
        const uploadedData = await uploadRes.json();
        
        if (!uploadRes.ok) {
          throw new Error(uploadedData.error?.message || "Gagal upload gambar ke Cloudinary");
        }
        finalImageUrl = uploadedData.secure_url;
        setIsUploadingImage(false);
      }

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
        image: finalImageUrl,
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Katalog Produk
          </h1>
          <p className="text-xs text-slate-500">
            Kelola daftar barang dagangan, harga modal, harga jual, dan batas minimum stok toko
          </p>
        </div>

        {isOwner && (
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            <span>Tambah Produk</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-2.5 items-center justify-between shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            >
              <option value="all">Semua Kategori</option>
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
              className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
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
          className={`h-9 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shrink-0 ${
            filterLowStock
              ? "bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-xs"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Hanya Stok Menipis</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat katalog produk...
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
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5 w-14 text-center">Gambar</th>
                  <th className="py-2.5 px-3.5">Nama Produk & SKU</th>
                  <th className="py-2.5 px-3.5">Kategori</th>
                  {isOwner && <th className="py-2.5 px-3.5 text-right">Harga Modal</th>}
                  <th className="py-2.5 px-3.5 text-right">Harga Jual</th>
                  {isOwner && <th className="py-2.5 px-3.5 text-right">Margin / Unit</th>}
                  <th className="py-2.5 px-3.5 text-center">Stok Fisik</th>
                  <th className="py-2.5 px-3.5 text-center">Status</th>
                  {isOwner && <th className="py-2.5 px-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const profitUnit = p.sellingPrice - p.costPrice;

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="w-9 h-9 rounded border border-slate-200 overflow-hidden bg-slate-100 mx-auto shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image || "/placeholder.png"}
                            alt={p.name}
                            className="w-full h-full object-cover scale-[1.02]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.png";
                            }}
                          />
                        </div>
                      </td>
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

                      {isOwner && (
                        <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-500 font-medium">
                          {formatRupiah(p.costPrice)}
                        </td>
                      )}

                      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatRupiah(p.sellingPrice)}
                      </td>

                      {isOwner && (
                        <td className="py-2.5 px-3.5 text-right font-mono tabular-nums">
                          <span
                            className={`font-semibold ${
                              profitUnit >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {formatRupiah(profitUnit)}
                          </span>
                        </td>
                      )}

                      <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-semibold text-slate-800">
                        {p.stock} <span className="text-slate-400 font-normal font-sans">{p.unit}</span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <StockBadge stock={p.stock} minimumStock={p.minimumStock} />
                      </td>

                      {isOwner && (
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Gambar Produk (Opsional)
            </label>
            <div className="flex items-center gap-3">
              {(selectedImage || formData.image) && (
                <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={selectedImage ? URL.createObjectURL(selectedImage) : formData.image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedImage(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
            </div>
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
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
            <Button type="submit" isLoading={isSubmitting || isUploadingImage}>
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
