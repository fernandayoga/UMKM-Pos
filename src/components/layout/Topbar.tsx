"use client";

import React from "react";
import { Menu, LogOut, Calendar } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const todayStr = formatDate(new Date(), false);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-800 block leading-tight">
            {session?.user?.name || "Kasir"}
          </span>
          <span className="text-[10px] text-slate-400 capitalize">
            {session?.user?.role === "owner" ? "Pemilik Toko" : "Kasir Aktif"}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Keluar dari akun"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
