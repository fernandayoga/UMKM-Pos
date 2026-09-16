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
  CreditCard,
  Banknote,
  QrCode,
  Package,
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

    setCart((prev) => {
      const next = new Map(prev);
      const currentQty = next.get(product._id) || 0;
      if (currentQty + 1 > product.stock) {
        showError(`Maksimal stok tersedia untuk ${product.name} adalah ${product.stock} ${product.unit}.`);
        return prev;
      }
      next.set(product._id, currentQty + 1);
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const currentQty = next.get(productId) || 0;
      const product = products.find((p) => p._id === productId);

      const newQty = currentQty + delta;
      if (newQty <= 0) {
        next.delete(productId);
      } else {
        if (product && newQty > product.stock) {
          showError(`Stok tidak mencukupi. Sisa stok: ${product.stock} ${product.unit}.`);
          return prev;
        }
        next.set(productId, newQty);
      }
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
      {/* 1. Barcode Scanner & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Scan barcode atau cari produk... (F2)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-14 rounded-lg border border-slate-200 bg-slate-50/60 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f5b53] focus:bg-white transition-all placeholder:text-slate-400"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono shadow-2xs">
              F2
            </kbd>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#ccfbf1] text-[#0f5b53] border border-[#99f6e4] shrink-0 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0f5b53] animate-pulse" />
            <span>Scanner Siap</span>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Catalog on Left (8 cols), Cart on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Products Catalog (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === "all"
                  ? "bg-[#0f5b53] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Semua Produk</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {products.length}
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat._id
                    ? "bg-[#0f5b53] text-white font-semibold shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Secondary filter line */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input type="checkbox" defaultChecked className="accent-[#0f5b53] rounded" />
              <span>Hanya Stok Tersedia (&gt;0)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Urutkan: <strong>Paling Sering Dibeli</strong>
            </span>
          </div>

          {/* Product Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl border border-slate-200 bg-white p-3 animate-pulse flex flex-col justify-between"
                >
                  <div className="h-20 bg-slate-100 rounded-lg w-full mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded w-1/2 mt-2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Package className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Tidak ada produk ditemukan
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ubah kata kunci pencarian atau pilih kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minimumStock;
                const qtyInCart = cart.get(product._id) || 0;

                return (
                  <div
                    key={product._id}
                    className={`relative rounded-xl border bg-white transition-all flex flex-col justify-between overflow-hidden shadow-2xs ${
                      isOutOfStock
                        ? "opacity-60 border-slate-200 bg-slate-50/80"
                        : qtyInCart > 0
                        ? "border-[#0f5b53] ring-1.5 ring-[#0f5b53]/40 shadow-sm"
                        : "border-slate-200 hover:border-[#0f5b53]/60 hover:shadow-md"
                    }`}
                  >
                    {/* Top Thumbnail Container */}
                    <div className="relative h-24 w-full bg-slate-100/70 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                      <div className="text-slate-300 font-mono text-2xl font-black select-none">
                        {product.name.charAt(0)}
                      </div>

                      {/* Stock Pill on top right of thumbnail */}
                      <span
                        className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                          isOutOfStock
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isLowStock
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-white/95 text-slate-700 border-slate-200 backdrop-blur-xs"
                        }`}
                      >
                        {product.stock} {product.unit}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                          {typeof product.categoryId === "object" && product.categoryId
                            ? (product.categoryId as any).name
                            : "RETAIL"}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 leading-tight">
                          {product.name}
                        </h3>
                      </div>

                      {/* Price & Add Button */}
                      <div className="pt-2.5 mt-2 flex items-center justify-between border-t border-slate-100">
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {formatRupiah(product.sellingPrice)}
                          </span>
                        </div>

                        <button
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className="w-7 h-7 rounded-lg bg-[#5eead4] hover:bg-[#2dd4bf] active:scale-95 text-[#042f2e] font-black text-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
                          title="Tambah ke keranjang"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart & Quick Checkout Panel (4 cols) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-[0_3px_14px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.04)] p-4.5 sticky top-18 space-y-3.5">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800">
                #INV-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0048
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                title="Kosongkan Keranjang"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Customer select pill */}
          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900 block text-xs leading-none">
                Pelanggan Umum (Walk-in)
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Harga Retail Standar
              </span>
            </div>
            <button className="text-[11px] font-semibold text-[#0f5b53] hover:underline">
              Ganti / Member
            </button>
          </div>

          {/* Cart Items List */}
          <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <span>Pilih produk di sebelah kiri untuk menambah ke struk belanja.</span>
              </div>
            ) : (
              cartItems.map(({ product, quantity, subtotal: itemTotal }) => (
                <div key={product._id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      @ {formatRupiah(product.sellingPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(product._id, -1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-slate-800 text-[11px]">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product._id, 1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-slate-900 w-16 text-right text-[11px]">
                      {formatRupiah(itemTotal)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Subtotal ({totalCartCount} produk)</span>
              <span className="font-semibold text-slate-800">{formatRupiah(subtotal)}</span>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>% Tambah Diskon (F4)</span>
              <span className="font-semibold text-slate-800">
                {discountAmount > 0 ? `-${formatRupiah(discountAmount)}` : "Rp 0"}
              </span>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Pajak Resto / PB1</span>
              <span className="text-slate-400">Non-PKP (Rp 0)</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-slate-900">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                TOTAL PEMBAYARAN
              </span>
              <span className="text-lg font-black text-slate-900 tracking-tight">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Tabs (Tunai / QRIS / Transfer) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === "cash"
                  ? "bg-[#0f5b53] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              💵 Tunai
            </button>
            <button
              onClick={() => {
                setPaymentMethod("qris");
                setCashGiven(grandTotal);
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === "qris"
                  ? "bg-[#0f5b53] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              📱 QRIS
            </button>
            <button
              onClick={() => {
                setPaymentMethod("transfer");
                setCashGiven(grandTotal);
              }}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === "transfer"
                  ? "bg-[#0f5b53] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              🏦 Transfer
            </button>
          </div>

          {/* Quick Cash Buttons & Calculation (when cash is selected) */}
          {paymentMethod === "cash" && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setCashGiven(grandTotal)}
                  className="py-1 text-[11px] font-bold bg-[#ccfbf1] text-[#0f5b53] hover:bg-[#99f6e4] rounded border border-[#99f6e4] transition-colors"
                >
                  Uang Pas
                </button>
                {[20000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashGiven(amt)}
                    className="py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700 transition-colors"
                  >
                    {(amt / 1000).toFixed(0)}.000
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Uang Diterima</span>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                    className="w-full h-8 px-2 text-xs font-bold rounded border border-slate-200 bg-slate-50"
                    placeholder="Rp 0"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Kembalian</span>
                  <div className="h-8 px-2 flex items-center justify-between rounded bg-[#ccfbf1] text-[#042f2e] border border-[#99f6e4] text-xs font-black">
                    <span>{formatRupiah(Math.max(0, cashGiven - grandTotal))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary Complete Checkout Button */}
          <button
            onClick={handleCheckoutSubmit}
            disabled={cartItems.length === 0 || (paymentMethod === "cash" && cashGiven < grandTotal) || isProcessing}
            className="w-full py-3 rounded-xl bg-[#0f5b53] hover:bg-[#0c4e47] active:bg-[#083b35] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isProcessing ? "Memproses..." : "Selesaikan Pembayaran (F9)"}</span>
          </button>
        </div>
      </div>

      {/* 3. Bottom Keyboard Shortcuts Bar */}
      <div className="hidden sm:flex items-center justify-between px-4 py-2 bg-white rounded-xl border border-slate-200/90 text-[11px] text-slate-500 shadow-2xs">
        <div className="flex items-center gap-4">
          <span><kbd className="font-bold text-slate-700">F1</kbd> Cari Produk</span>
          <span><kbd className="font-bold text-slate-700">F2</kbd> Barcode Scan</span>
          <span><kbd className="font-bold text-slate-700">F4</kbd> Diskon Item</span>
          <span><kbd className="font-bold text-slate-700">F8</kbd> Tahan Struk</span>
          <span><kbd className="font-bold text-slate-700">F9</kbd> Bayar Cepat</span>
        </div>
        <span className="text-[10px] text-emerald-700 font-semibold">● Sistem POS Online</span>
      </div>

      {/* Mobile Floating Cart Summary Button (screen < lg) */}
      <div className="fixed bottom-4 left-4 right-4 lg:hidden z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          disabled={cartItems.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl shadow-lg flex items-center justify-between font-medium disabled:opacity-50"
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
        description="Pilih metode pembayaran dan masukkan jumlah uang yang diterima dari pelanggan."
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Total display box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 block">Total Pembayaran</span>
              <span className="text-lg font-bold text-blue-700">
                {formatRupiah(grandTotal)}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {cartItems.length} produk ({totalCartCount} pcs)
            </span>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === "cash"
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("qris");
                  setCashGiven(grandTotal);
                }}
                className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === "qris"
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("transfer");
                  setCashGiven(grandTotal);
                }}
                className={`p-2.5 rounded-lg border text-center text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === "transfer"
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Transfer Bank</span>
              </button>
            </div>
          </div>

          {/* Cash Input & Quick Denomination Buttons */}
          {paymentMethod === "cash" && (
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
                  className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                    className="px-2.5 py-1 text-xs bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-700 font-medium"
                  >
                    +{formatRupiah(amount)}
                  </button>
                ))}
              </div>

              {/* Kembalian calculation display */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Kembalian:</span>
                <span
                  className={`text-sm font-bold ${
                    cashGiven < grandTotal ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {cashGiven < grandTotal
                    ? `Kurang ${formatRupiah(grandTotal - cashGiven)}`
                    : formatRupiah(changeDue)}
                </span>
              </div>
            </div>
          )}

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
              disabled={paymentMethod === "cash" && cashGiven < grandTotal}
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
                <div className="flex justify-between capitalize">
                  <span>Bayar ({completedSale.paymentMethod}):</span>
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

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceiptOpen(false)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Transaksi Baru</span>
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Cetak Nota</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
