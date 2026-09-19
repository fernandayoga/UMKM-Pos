"use client";

import React from "react";
import { Menu, Calendar } from "lucide-react";
import { useSession } from "next-auth/react";
import { formatDate, cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  onOpenAI?: () => void;
}

export function Topbar({ onMenuClick, onOpenAI }: TopbarProps) {
  const { data: session } = useSession();
  const todayStr = formatDate(new Date(), false);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
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

      <div className="flex items-center gap-2.5 sm:gap-3">
        
        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 sm:gap-3 max-w-[200px] sm:max-w-xs shadow-xs">
          <div className="truncate text-right">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {session?.user?.name ? session.user.name.split(' (')[0] : "Pengguna"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {session?.user?.email || "user@example.com"}
            </p>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0",
              session?.user?.role === "owner"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            )}
          >
            {session?.user?.role === "owner" ? "Owner" : "Kasir"}
          </span>
        </div>
      </div>
    </header>
  );
}
