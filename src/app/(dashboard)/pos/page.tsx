"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Printer,
  RotateCcw,
  Banknote,
  Package,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { IProduct, ICategory, PaymentMethod, ISale } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StockBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export default function POSPage() {
  const { toast, success, error: showError } = useToast();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);

  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Payment Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal state
  const [completedSale, setCompletedSale] = useState<ISale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Mobile cart sheet state
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Fetch initial data
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
      showError("Gagal memuat katalog produk.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" ||
        (typeof p.categoryId === "object" ? (p.categoryId as any)._id : p.categoryId) ===
          selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart items with full product data
  const cartItems = useMemo(() => {
    const list: Array<{ product: IProduct; quantity: number; subtotal: number }> = [];
    cart.forEach((qty, pid) => {
      const prod = products.find((p) => p._id === pid);
      if (prod) {
        list.push({
          product: prod,
          quantity: qty,
          subtotal: prod.sellingPrice * qty,
        });
      }
    });
    return list;
  }, [cart, products]);

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalCartCount = useMemo(() => {
    let count = 0;
    cart.forEach((qty) => (count += qty));
    return count;
  }, [cart]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== "cash") return 0;
    return Math.max(0, cashGiven - grandTotal);
  }, [cashGiven, grandTotal, paymentMethod]);

  // Cart actions
  const addToCart = (product: IProduct) => {
    if (product.stock <= 0) {
      showError(`Stok ${product.name} telah habis.`);
      return;
    }

    const currentQty = cart.get(product._id) || 0;
    if (currentQty + 1 > product.stock) {
      showError(`Maksimal stok tersedia untuk ${product.name} adalah ${product.stock} ${product.unit}.`);
      return;
    }

    setCart((prev) => {
      const next = new Map(prev);
      next.set(product._id, currentQty + 1);
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const currentQty = cart.get(productId) || 0;
    const product = products.find((p) => p._id === productId);

    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (product && newQty > product.stock) {
      showError(`Stok tidak mencukupi. Sisa stok: ${product.stock} ${product.unit}.`);
      return;
    }

    setCart((prev) => {
      const next = new Map(prev);
      next.set(productId, newQty);
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

  const clearCart = () => {
    setCart(new Map());
    setDiscountAmount(0);
    setCashGiven(0);
  };

  // Open checkout modal
  const handleOpenPayment = () => {
    if (cartItems.length === 0) {
      showError("Keranjang belanja masih kosong.");
      return;
    }
    setPaymentMethod("cash");
    setCashGiven(grandTotal);
    setIsPaymentOpen(true);
  };

  // Submit checkout to server
  const handleCheckoutSubmit = async () => {
    if (paymentMethod === "cash" && cashGiven < grandTotal) {
      showError(`Uang tunai kurang dari total belanja (${formatRupiah(grandTotal)}).`);
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        items: cartItems.map((it) => ({
          productId: it.product._id,
          quantity: it.quantity,
        })),
        discount: discountAmount,
        paymentMethod,
        paidAmount: paymentMethod === "cash" ? cashGiven : grandTotal,
      };

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyelesaikan transaksi.");
      }

      success("Transaksi berhasil! Stok telah diperbarui.");
      setCompletedSale(data.sale);
      setIsPaymentOpen(false);
      clearCart();
      setIsMobileCartOpen(false);
      setIsReceiptOpen(true);

      // Refresh product stock catalog
      loadData();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat memproses checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top action / context bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Kasir (Point of Sale)
          </h1>
          <p className="text-xs text-slate-500">
            Pilih produk, masukkan ke keranjang, dan selesaikan transaksi kasir
          </p>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Grid Compact (8–12 produk langsung terlihat)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid Compact</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan List / Row (Cepat untuk Scan Barcode & SKU)"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List View</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Catalog on left (7-8 cols), Cart on right (4-5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Products Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-emerald-700 text-white shadow-xs font-semibold"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat._id
                    ? "bg-emerald-700 text-white shadow-xs font-semibold"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Catalog Content */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-lg border border-slate-200 bg-white p-2.5 animate-pulse flex flex-col justify-between"
                >
                  <div className="w-full h-20 bg-slate-100 rounded mb-2 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                    <div className="h-3.5 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
              <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Tidak ada produk ditemukan
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ubah kata kunci pencarian atau pilih kategori lain.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Mode 1: Grid Compact (8-12 produk langsung terlihat) */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const qtyInCart = cart.get(product._id) || 0;

                return (
                  <div
                    key={product._id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group relative text-left p-2.5 rounded-lg border bg-white transition-all flex flex-col justify-between cursor-pointer select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : qtyInCart > 0
                        ? "border-emerald-600 ring-1 ring-emerald-500 shadow-xs bg-emerald-50/20"
                        : "border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm"
                    }`}
                  >
                    {/* Compact Image Container */}
                    <div className="w-full h-20 mb-2 rounded overflow-hidden bg-slate-100 border border-slate-100 shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/placeholder.png"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.png";
                        }}
                      />

                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded">
                            Habis
                          </span>
                        </div>
                      )}

                      {/* Remove from Cart Button (Pojok Kiri Atas) */}
                      {qtyInCart > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(product._id);
                          }}
                          className="absolute top-1 left-1 z-10 w-5 h-5 bg-rose-600 hover:bg-rose-700 active:scale-90 text-white rounded-full flex items-center justify-center shadow-xs border border-white transition-transform"
                          title="Hapus dari keranjang"
                        >
                          <X className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      )}

                      {/* In Cart Indicator */}
                      {qtyInCart > 0 && (
                        <div className="absolute top-1 right-1 bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {qtyInCart} di keranjang
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase truncate">
                          {product.sku}
                        </span>
                        <h3
                          className="text-xs font-semibold text-slate-900 line-clamp-1 mt-0.5 leading-tight"
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </div>

                      {/* Footer: Price + Direct Quantity Stepper */}
                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between gap-1 w-full">
                        <div>
                          <span className="text-xs font-bold text-emerald-800 font-mono tabular-nums block">
                            {formatRupiah(product.sellingPrice)}
                          </span>
                        </div>

                        {/* Direct +/- Shortcut Buttons */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        >
                          {qtyInCart > 0 ? (
                            <div className="flex items-center border border-emerald-300 rounded overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product._id, -1)}
                                className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Kurangi kuantiti"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-5 text-center text-[10px] font-bold text-emerald-800 tabular-nums">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product._id, 1)}
                                className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Tambah kuantiti"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={isOutOfStock}
                              className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-colors flex items-center gap-1 disabled:opacity-40"
                              title="Tambah ke keranjang"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden xl:inline">Tambah</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 2: List / Row View (Untuk kasir cepat & scan barcode) */
            <div className="space-y-1.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const qtyInCart = cart.get(product._id) || 0;

                return (
                  <div
                    key={product._id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                        : qtyInCart > 0
                        ? "bg-emerald-50/40 border-emerald-300 shadow-xs"
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/70 shadow-xs"
                    }`}
                  >
                    {/* Left: Thumbnail + Name + SKU */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image || "/placeholder.png"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.png";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {product.name}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-100 rounded shrink-0">
                            {product.sku}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {product.categoryName || "Umum"}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Stock Badge + Price */}
                    <div className="flex items-center gap-3 shrink-0">
                      <StockBadge
                        stock={product.stock}
                        minimumStock={product.minimumStock}
                      />
                      <span className="text-xs font-bold text-emerald-800 font-mono tabular-nums w-24 text-right">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                    </div>

                    {/* Right: Quantity Stepper or Add Button */}
                    <div
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {qtyInCart > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(product._id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus dari keranjang"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center border border-emerald-300 rounded overflow-hidden bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product._id, -1)}
                              className="p-1 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Kurangi kuantiti"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-emerald-800 tabular-nums">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product._id, 1)}
                              className="p-1 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Tambah kuantiti"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors disabled:opacity-40"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart Column (5 cols on lg, 4 on xl) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-16">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Keranjang Belanja
              </h2>
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto my-3 pr-1">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <span>Klik produk di sebelah kiri untuk menambahkan ke keranjang.</span>
              </div>
            ) : (
              cartItems.map(({ product, quantity, subtotal: itemTotal }) => (
                <div key={product._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {formatRupiah(product.sellingPrice)} × {quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-800 font-mono tabular-nums">
                      {formatRupiah(itemTotal)}
                    </span>

                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Hapus item"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({totalCartCount} item)</span>
              <span className="font-semibold font-mono tabular-nums">{formatRupiah(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Diskon (Rp)</span>
              <input
                type="number"
                min="0"
                step="500"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-24 px-2 py-1 text-right text-xs rounded border border-slate-200 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-slate-900">
              <span className="text-sm font-bold">TOTAL TAGIHAN</span>
              <span className="text-base font-extrabold text-emerald-800 font-mono tabular-nums">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          {/* Checkout CTA */}
          <Button
            onClick={handleOpenPayment}
            disabled={cartItems.length === 0}
            size="lg"
            className="w-full mt-4 font-bold text-sm"
          >
            <Banknote className="w-4 h-4 mr-1.5" />
            <span>Bayar / Checkout</span>
          </Button>
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button (screen < lg) */}
      <div className="fixed bottom-4 left-4 right-4 lg:hidden z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          disabled={cartItems.length === 0}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl shadow-lg flex items-center justify-between font-medium disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">{totalCartCount} Item di Keranjang</span>
          </div>
          <span className="text-sm font-bold">{formatRupiah(grandTotal)}</span>
        </button>
      </div>

      {/* Payment Checkout Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Pembayaran Transaksi"
        description="Masukkan jumlah uang tunai yang diterima dari pelanggan."
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Total display box */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 block">Total Pembayaran</span>
              <span className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
                {formatRupiah(grandTotal)}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium font-mono tabular-nums">
              {cartItems.length} produk ({totalCartCount} pcs)
            </span>
          </div>

          {/* Payment Method - Tunai Only */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Metode Pembayaran
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-600 bg-emerald-50/70 text-emerald-800 text-xs font-bold">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Tunai (Cash)</span>
            </div>
          </div>

          {/* Cash Input & Quick Denomination Buttons */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Uang Diterima (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={cashGiven || ""}
                onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-slate-300 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Masukkan jumlah pembayaran"
                autoFocus
              />
            </div>

            {/* Quick Cash Buttons */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCashGiven(grandTotal)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium text-slate-700"
              >
                Uang Pas
              </button>
              {[10000, 20000, 50000, 100000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCashGiven((prev) => (prev > 0 ? prev + amount : amount))}
                  className="px-2.5 py-1 text-xs bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-700 font-mono tabular-nums font-medium"
                >
                  +{formatRupiah(amount)}
                </button>
              ))}
            </div>

            {/* Kembalian calculation display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">Kembalian:</span>
              <span
                className={`text-sm font-bold font-mono tabular-nums ${
                  cashGiven < grandTotal ? "text-rose-600" : "text-emerald-800"
                }`}
              >
                {cashGiven < grandTotal
                  ? `Kurang ${formatRupiah(grandTotal - cashGiven)}`
                  : formatRupiah(changeDue)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              onClick={handleCheckoutSubmit}
              isLoading={isProcessing}
              disabled={cashGiven < grandTotal}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>Selesaikan Transaksi</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Thermal Receipt Print Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Nota Pembelian Berhasil"
        maxWidth="sm"
      >
        {completedSale && (
          <div className="space-y-4">
            {/* Printable Thermal Receipt Box */}
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
                  {completedSale.invoiceNumber}
                </p>
                <p className="text-[10px] text-slate-500">
                  Kasir: {completedSale.cashierName} •{" "}
                  {new Date(completedSale.createdAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300 text-[11px]">
                {completedSale.items.map((it, idx) => (
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

              {/* Financial Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(completedSale.subtotal)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(completedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(completedSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar ({completedSale.paymentMethod === "cash" ? "Tunai" : completedSale.paymentMethod}):</span>
                  <span>{formatRupiah(completedSale.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembali:</span>
                  <span>{formatRupiah(completedSale.changeAmount)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p>Terima kasih atas kunjungan Anda 🙏</p>
                <p>Barang yang sudah dibeli tidak dapat ditukar kembali.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptOpen(false)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Transaksi Baru</span>
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
