"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Boxes,
  History,
  Truck,
  Receipt,
  BarChart3,
  Users,
  Settings,
  X,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI?: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenAI }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "cashier";

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["owner", "cashier"],
    },
    {
      name: "Kasir (POS)",
      href: "/pos",
      icon: ShoppingCart,
      roles: ["owner", "cashier"],
      badge: "Utama",
    },
    {
      name: "Produk",
      href: "/products",
      icon: Package,
      roles: ["owner", "cashier"],
    },
    {
      name: "Kategori",
      href: "/products/categories",
      icon: Tags,
      roles: ["owner"],
    },
    {
      name: "Inventori Stok",
      href: "/inventory",
      icon: Boxes,
      roles: ["owner", "cashier"],
    },
    {
      name: "Mutasi Stok",
      href: "/inventory/movements",
      icon: History,
      roles: ["owner", "cashier"],
    },
    {
      name: "Supplier",
      href: "/suppliers",
      icon: Truck,
      roles: ["owner", "cashier"],
    },
    {
      name: "Riwayat Penjualan",
      href: "/sales",
      icon: Receipt,
      roles: ["owner", "cashier"],
    },
    {
      name: "Laporan & Profit",
      href: "/reports",
      icon: BarChart3,
      roles: ["owner"],
    },
    {
      name: "Kelola Kasir / User",
      href: "/users",
      icon: Users,
      roles: ["owner"],
    },
    {
      name: "Pengaturan Toko",
      href: "/settings",
      icon: Settings,
      roles: ["owner"],
    },
  ];

  const filteredNav = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden backdrop-blur-none"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:shrink-0 overflow-hidden select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-slate-200 shadow-2xs shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo UMKM POS" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-none">
                UMKM POS
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Retail & Inventory
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-emerald-600" : "text-slate-400"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
               
              </Link>
            );
          })}

          {onOpenAI && (
            <button
              onClick={() => {
                onClose();
                onOpenAI();
              }}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 transition-colors mt-2"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">AI Assistant</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-600 text-white rounded">
                AI
              </span>
            </button>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-3 shrink-0 border-t border-slate-100">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
}
