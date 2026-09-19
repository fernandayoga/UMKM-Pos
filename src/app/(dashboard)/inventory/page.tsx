"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Boxes,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Download,
  Plus,
  MoreVertical,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
} from "lucide-react";
import { IProduct, ISupplier, ICategory, IInventoryMovement } from "@/types";
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
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "safe" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Active 3-dots row dropdown ID & smart direction (up vs down)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Kartu Stok (Product Movement Ledger) Modal State
  const [selectedLedgerProduct, setSelectedLedgerProduct] = useState<IProduct | null>(null);
  const [ledgerMovements, setLedgerMovements] = useState<IInventoryMovement[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    const handleScroll = () => {
      setActiveMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, supRes, catRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/suppliers"),
        fetch("/api/categories"),
      ]);
      const prodData = await prodRes.json();
      const supData = await supRes.json();
      const catData = await catRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (supData.suppliers) setSuppliers(supData.suppliers);
      if (catData.categories) setCategories(catData.categories);
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

      let matchCategory = true;
      if (categoryFilter !== "all") {
        const catId = typeof p.categoryId === "object" ? (p.categoryId as any)._id : p.categoryId;
        matchCategory = catId === categoryFilter || p.categoryName === categoryFilter;
      }

      return matchSearch && matchStatus && matchCategory;
    });
  }, [products, search, statusFilter, categoryFilter]);

  // Overview Counts
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock).length;
  const safeStockCount = products.filter((p) => p.stock > p.minimumStock).length;

  // Has any active filter
  const hasActiveFilter = search !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  // Toggle card status filter
  const handleCardFilterToggle = (status: "safe" | "low" | "out") => {
    if (statusFilter === status) {
      setStatusFilter("all");
    } else {
      setStatusFilter(status);
    }
  };

  // Export filtered products to CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      showError("Tidak ada data inventori untuk diexport.");
      return;
    }

    const headers = [
      "SKU",
      "Nama Produk",
      "Kategori",
      "Stok Saat Ini",
      "Batas Minimum",
      "Satuan",
      "Status Stok",
      "Harga Modal (HPP)",
      "Harga Jual",
    ];

    const rows = filteredProducts.map((p) => {
      const statusText =
        p.stock <= 0 ? "Habis" : p.stock <= p.minimumStock ? "Menipis" : "Aman";

      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.categoryName || "Umum").replace(/"/g, '""')}"`,
        p.stock,
        p.minimumStock,
        `"${p.unit}"`,
        `"${statusText}"`,
        p.costPrice,
        p.sellingPrice,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `inventori-stok-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success("Data inventori berhasil diexport ke CSV!");
  };

  // Toggle 3-dots menu with smart direction (drop-up vs drop-down)
  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, productId: string) => {
    e.stopPropagation();
    if (activeMenuId === productId) {
      setActiveMenuId(null);
      return;
    }

    const buttonEl = e.currentTarget;
    const rect = buttonEl.getBoundingClientRect();
    const spaceBelowWindow = window.innerHeight - rect.bottom;

    // Check distance to bottom of scrollable container if table is inside one
    const scrollContainer = buttonEl.closest(".overflow-y-auto");
    let spaceBelowContainer = Infinity;
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      spaceBelowContainer = containerRect.bottom - rect.bottom;
    }

    // Dropdown height is ~85-90px. If space below in window or scroll container is less than 120px, flip upwards
    if (spaceBelowWindow < 130 || spaceBelowContainer < 120) {
      setMenuDirection("up");
    } else {
      setMenuDirection("down");
    }

    setActiveMenuId(productId);
  };

  // Open Stock In
  const handleOpenStockIn = (preselectedProductId?: string) => {
    setActiveMenuId(null);
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
    setActiveMenuId(null);
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

  // Open Kartu Stok (Product Ledger)
  const handleOpenLedger = async (product: IProduct) => {
    setActiveMenuId(null);
    setSelectedLedgerProduct(product);
    setIsLoadingLedger(true);
    try {
      const res = await fetch(`/api/inventory/movements?productId=${product._id}&limit=50`);
      const data = await res.json();
      if (data.movements) {
        setLedgerMovements(data.movements);
      } else {
        setLedgerMovements([]);
      }
    } catch {
      showError("Gagal memuat kartu riwayat stok produk.");
    } finally {
      setIsLoadingLedger(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inventori Stok Barang
          </h1>
          <p className="text-xs text-slate-500">
            Pantau ketersediaan stok fisik, penerimaan barang supplier, dan audit selisih stok
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
            title="Download data tabel ke format CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span>Export CSV</span>
          </Button>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAdjust()}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              title="Sesuaikan stok fisik opname toko"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-600" />
              <span>Penyesuaian Fisik</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => handleOpenStockIn()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
            title="Catat penerimaan stok masuk baru"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
            <span>Stock In (Barang Masuk)</span>
          </Button>
        </div>
      </div>

      {/* 2. Interactive Clickable Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card: Stok Aman */}
        <div
          onClick={() => handleCardFilterToggle("safe")}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
            statusFilter === "safe"
              ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs"
          }`}
          title="Klik untuk filter hanya Stok Aman (klik lagi untuk reset)"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Stok Aman</span>
              {statusFilter === "safe" && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Filter Aktif
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-emerald-800 font-mono tabular-nums mt-0.5">
              {safeStockCount}
            </p>
          </div>
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
              statusFilter === "safe"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            ✓
          </span>
        </div>

        {/* Card: Stok Menipis */}
        <div
          onClick={() => handleCardFilterToggle("low")}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
            statusFilter === "low"
              ? "border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs"
          }`}
          title="Klik untuk filter hanya Stok Menipis (klik lagi untuk reset)"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">
                Stok Menipis (Perlu Restock)
              </span>
              {statusFilter === "low" && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Filter Aktif
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-0.5">
              {lowStockCount}
            </p>
          </div>
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
              statusFilter === "low"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            !
          </span>
        </div>

        {/* Card: Stok Habis */}
        <div
          onClick={() => handleCardFilterToggle("out")}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
            statusFilter === "out"
              ? "border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs"
              : "bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs"
          }`}
          title="Klik untuk filter hanya Stok Habis (klik lagi untuk reset)"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Stok Habis (Kosong)</span>
              {statusFilter === "out" && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                  Filter Aktif
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-0.5">
              {outOfStockCount}
            </p>
          </div>
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
              statusFilter === "out"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-600 border border-rose-200"
            }`}
          >
            ✕
          </span>
        </div>
      </div>

      {/* 3. Search & Category Dropdown Toolbar (No redundant pills) */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center justify-between shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative w-full sm:w-52">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-colors"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right toolbar controls: Active Filter Indicator & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
            Menampilkan <strong className="text-slate-800">{filteredProducts.length}</strong> dari{" "}
            {products.length} barang
          </span>

          
        </div>
      </div>

      {/* 4. Inventory Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat data inventori...
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Tidak ada data produk yang cocok"
            description="Periksa kata kunci pencarian atau reset filter status stok Anda."
          />
        ) : (
          <div className="overflow-x-auto min-h-[220px] max-h-[calc(100vh-270px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5">Nama Produk & SKU</th>
                  <th className="py-2.5 px-3.5">Kategori</th>
                  <th className="py-2.5 px-3.5 text-right">Stok Saat Ini</th>
                  <th className="py-2.5 px-3.5 text-right">Batas Minimum</th>
                  <th className="py-2.5 px-3.5 text-center">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Nama Produk & SKU */}
                    <td className="py-2.5 px-3.5">
                      <span className="font-semibold text-slate-900 block text-xs">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {p.categoryName || "Umum"}
                      </span>
                    </td>

                    {/* Stok Saat Ini */}
                    <td className="py-2.5 px-3.5 text-right">
                      <span
                        className={`font-mono text-xs font-bold ${
                          p.stock === 0
                            ? "text-rose-600"
                            : p.stock <= p.minimumStock
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}
                      >
                        {p.stock}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        {p.unit || "pcs"}
                      </span>
                    </td>

                    {/* Batas Minimum */}
                    <td className="py-2.5 px-3.5 text-right font-mono text-[11px] text-slate-500">
                      {p.minimumStock} {p.unit || "pcs"}
                    </td>

                    {/* Status Stok */}
                    <td className="py-2.5 px-3.5 text-center">
                      <StockBadge stock={p.stock} minimumStock={p.minimumStock} />
                    </td>

                    {/* Quick ERP Stock Actions */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        {/* Primary Action Button: Compact Stock In */}
                        <button
                          onClick={() => handleOpenStockIn(p._id)}
                          className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Tambah penerimaan stok masuk"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Stock In</span>
                        </button>

                        {/* 3-Dots Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(e, p._id)}
                            className={`p-1 rounded-md border text-slate-500 hover:text-slate-900 transition-colors ${
                              activeMenuId === p._id
                                ? "bg-slate-100 border-slate-300 text-slate-900"
                                : "border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                            title="Menu aksi lainnya"
                            aria-label="Menu aksi lainnya"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Floating Menu (Smart Auto-Flip Up / Down) */}
                          {activeMenuId === p._id && (
                            <div
                              ref={menuRef}
                              className={`absolute right-0 ${
                                menuDirection === "up"
                                  ? "bottom-full mb-1.5 origin-bottom-right"
                                  : "top-full mt-1.5 origin-top-right"
                              } w-48 bg-white rounded-lg border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in-50 zoom-in-95 text-left`}
                            >
                              {/* Option 1: Stock Adjustment (Owner only) */}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(p._id)}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Sesuaikan Stok (Opname)</span>
                                </button>
                              )}

                              {/* Option 2: Riwayat Kartu Stok */}
                              <button
                                type="button"
                                onClick={() => handleOpenLedger(p)}
                                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span>Riwayat Kartu Stok</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Stock In */}
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

            <Input
              label="Harga Beli Modal Satuan (Opsional)"
              type="number"
              min="0"
              step="500"
              placeholder="Contoh: 15000"
              value={stockInForm.purchasePrice}
              onChange={(e) =>
                setStockInForm({ ...stockInForm, purchasePrice: e.target.value })
              }
            />
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

      {/* Modal 2: Stock Adjustment (Owner Only) */}
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
                <span className="font-bold text-slate-900 font-mono tabular-nums">
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
                className={`font-bold text-sm font-mono tabular-nums ${
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

      {/* Modal 3: Riwayat Kartu Stok (Product Ledger) */}
      <Modal
        isOpen={selectedLedgerProduct !== null}
        onClose={() => setSelectedLedgerProduct(null)}
        title={`Kartu Stok: ${selectedLedgerProduct?.name || ""}`}
        description={`Audit trail kronologis pergerakan fisik stok untuk SKU ${selectedLedgerProduct?.sku || ""}`}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {/* Product Header Pill */}
          {selectedLedgerProduct && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 block text-sm">
                  {selectedLedgerProduct.name}
                </span>
                <span className="font-mono text-slate-500">
                  SKU: {selectedLedgerProduct.sku} • Kategori:{" "}
                  {selectedLedgerProduct.categoryName || "Umum"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Stok Terkini:</span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-800">
                  {selectedLedgerProduct.stock} {selectedLedgerProduct.unit}
                </span>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          {isLoadingLedger ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Memuat mutasi stok produk...
            </div>
          ) : ledgerMovements.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada riwayat mutasi stok untuk produk ini.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-[11px] uppercase sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Tanggal & Waktu</th>
                    <th className="py-2 px-3">Jenis Mutasi</th>
                    <th className="py-2 px-3 text-right">Kuantitas</th>
                    <th className="py-2 px-3 text-right">Stok Sebelum → Sesudah</th>
                    <th className="py-2 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerMovements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                        {formatDate(m.createdAt, true)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === "STOCK_IN"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.type === "SALE"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.type === "STOCK_IN"
                            ? "Barang Masuk"
                            : m.type === "SALE"
                            ? "Penjualan Kasir"
                            : "Penyesuaian Fisik"}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold font-mono tabular-nums ${
                          m.quantity > 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {m.previousStock} → {m.newStock}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {m.createdByName || "Sistem"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLedgerProduct(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
