"use client";

import React from "react";
import { Menu, Search, HelpCircle, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path === "/") return "Ringkasan Bisnis";
    if (path.startsWith("/pos")) return "Operasional Kasir";
    if (path.startsWith("/products")) return "Master Produk & Stok";
    if (path.startsWith("/inventory")) return "Inventori Toko";
    if (path.startsWith("/suppliers")) return "Mitra Supplier";
    if (path.startsWith("/sales")) return "Riwayat Penjualan";
    if (path.startsWith("/reports")) return "Laporan Keuangan";
    if (path.startsWith("/users")) return "Kelola Karyawan";
    if (path.startsWith("/settings")) return "Pengaturan Toko";
    return "Operasional Toko";
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb style from reference */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span className="text-slate-800 font-bold">KasirFlow</span>
          <span className="text-slate-300">›</span>
          <span className="text-slate-500">{getPageTitle(pathname)}</span>
        </div>
      </div>

      {/* Global Quick Search (Ctrl+K) */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs text-slate-400 w-64 lg:w-80">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">Cari produk, transaksi... [Ctrl+K]</span>
        <kbd className="ml-auto text-[10px] bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-400 font-mono shadow-2xs">
          Ctrl K
        </kbd>
      </div>

      {/* Right status & badges */}
      <div className="flex items-center gap-3">
        {/* Shift status pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Kasir Buka • Shift Pagi</span>
        </div>

        {/* Help icon */}
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Bantuan & Panduan"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notification icon */}
        <button
          className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            2
          </span>
        </button>

        {/* User avatar thumbnail */}
        <div className="w-8 h-8 rounded-full bg-[#0f5b53]/10 text-[#0f5b53] border border-[#0f5b53]/30 flex items-center justify-center font-bold text-xs shadow-2xs">
          {(session?.user?.name || "B").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
