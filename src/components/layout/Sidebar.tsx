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
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:shrink-0 overflow-hidden select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-slate-700 shadow-xs shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo UMKM POS" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <span className="font-extrabold text-[14px] tracking-tight text-white block leading-none">
                UMKM POS
              </span>
              <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase leading-none mt-1 block">
                Retail & Inventory
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-none">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-semibold tracking-tight transition-all select-none",
                  isActive
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "text-slate-200 hover:bg-slate-800/90 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    )}
                    strokeWidth={isActive ? 2.2 : 2}
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
              className="group flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 shadow-xs transition-all mt-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-[18px] h-[18px] shrink-0 text-emerald-400" strokeWidth={2.2} />
                <span>AI Assistant</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-500 text-slate-950 rounded shadow-2xs">
                AI
              </span>
            </button>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-3 shrink-0 border-t border-slate-800/80">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
}
