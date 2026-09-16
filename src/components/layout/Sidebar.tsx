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
} from "lucide-react";
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Store className="w-4 h-4" />
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
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

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
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Role Card */}
        <div className="p-3 shrink-0 border-t border-slate-100">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {session?.user?.name || "Pengguna"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {session?.user?.email || "user@example.com"}
              </p>
            </div>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                userRole === "owner"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              )}
            >
              {userRole === "owner" ? "Owner" : "Kasir"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
