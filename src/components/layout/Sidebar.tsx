"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Store,
  Bot,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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
      name: "POS / Kasir",
      href: "/pos",
      icon: ShoppingCart,
      roles: ["owner", "cashier"],
    },
    {
      name: "Produk & Inventori",
      href: "/products",
      icon: Package,
      roles: ["owner", "cashier"],
    },
    {
      name: "Kategori Produk",
      href: "/products/categories",
      icon: Tags,
      roles: ["owner"],
    },
    {
      name: "Pemasok / Supplier",
      href: "/suppliers",
      icon: Truck,
      roles: ["owner", "cashier"],
    },
    {
      name: "Mutasi & Audit Stok",
      href: "/inventory/movements",
      icon: History,
      roles: ["owner", "cashier"],
    },
    {
      name: "Riwayat Penjualan",
      href: "/sales",
      icon: Receipt,
      roles: ["owner", "cashier"],
    },
    {
      name: "Laporan Bisnis",
      href: "/reports",
      icon: BarChart3,
      roles: ["owner"],
    },
    {
      name: "Kelola Karyawan",
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
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f5b53] flex items-center justify-center text-white shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-none">
                KasirFlow
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                POS & Retail Inventory
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

        {/* Store Branch Switcher Pill */}
        <div className="mx-3 mt-3 mb-1 p-2 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold truncate text-[11px] text-slate-800">
              Toko Maju Jaya • Cabang 1
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#0f5b53] text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive ? "text-white" : "text-slate-400"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}

          {/* AI Assistant trigger item with BETA tag */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                // trigger drawer open by event or window call
                window.dispatchEvent(new CustomEvent("open-ai-drawer"));
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-teal-50/60 hover:text-[#0f5b53] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-4 h-4 text-[#0f5b53] shrink-0" />
                <span>Asisten AI</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#ccfbf1] text-[#0f5b53] border border-[#99f6e4] rounded">
                BETA
              </span>
            </button>
          </div>
        </nav>

        {/* User Profile Card at Bottom */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-[#0f5b53]/10 text-[#0f5b53] border border-[#0f5b53]/20 flex items-center justify-center font-bold text-xs shrink-0">
                {(session?.user?.name || "B").charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {session?.user?.name || "Budi Santoso"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {userRole === "owner" ? "Owner / Admin" : "Kasir Operasional"}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
