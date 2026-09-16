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

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
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

      {/* Main Grid: Catalog on left (7 cols), Cart on right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Products Catalog (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-emerald-600 text-white shadow-sm"
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
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-xl border border-slate-200 bg-white p-3 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const qtyInCart = cart.get(product._id) || 0;

                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`relative text-left p-3.5 rounded-xl border bg-white transition-all flex flex-col justify-between h-36 ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : qtyInCart > 0
                        ? "border-emerald-600 ring-2 ring-emerald-500/25 shadow-[0_4px_16px_rgba(5,150,105,0.12)] bg-emerald-50/20 -translate-y-0.5"
                        : "border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.1)] hover:border-emerald-400 hover:-translate-y-0.5"
                    }`}
                  >
                    {qtyInCart > 0 && (
                      <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                        {qtyInCart}
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        {product.sku}
                      </span>
                      <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-100 mt-auto flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                      <StockBadge
                        stock={product.stock}
                        minimumStock={product.minimumStock}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart Column (5 cols on lg, 4 on xl) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-[0_4px_24px_rgba(15,23,42,0.08),0_1px_3px_rgba(0,0,0,0.04)] p-5 sticky top-20">
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
                    <p className="text-[11px] text-slate-500">
                      {formatRupiah(product.sellingPrice)} × {quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(product._id, -1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 transition-colors"
                        aria-label="Kurangi kuantiti"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product._id, 1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 transition-colors"
                        aria-label="Tambah kuantiti"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-semibold text-slate-800 w-20 text-right">
                      {formatRupiah(itemTotal)}
                    </span>

                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Hapus item"
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
              <span className="font-semibold">{formatRupiah(subtotal)}</span>
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
                className="w-24 px-2 py-1 text-right text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-slate-900">
              <span className="text-sm font-bold">TOTAL TAGIHAN</span>
              <span className="text-base font-extrabold text-emerald-700">
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
        description="Pilih metode pembayaran dan masukkan jumlah uang yang diterima dari pelanggan."
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Total display box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-500 block">Total Pembayaran</span>
              <span className="text-lg font-bold text-emerald-700">
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
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-bold"
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
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-bold"
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
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-bold"
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
                  className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
