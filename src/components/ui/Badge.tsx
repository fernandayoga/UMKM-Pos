import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  withDot?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  withDot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight",
        variant === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        variant === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
        variant === "danger" && "bg-rose-50 text-rose-700 border border-rose-200",
        variant === "info" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        variant === "neutral" && "bg-slate-100 text-slate-700 border border-slate-200",
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "danger" && "bg-rose-500",
            variant === "info" && "bg-emerald-500",
            variant === "neutral" && "bg-slate-400"
          )}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Helper badge specifically for Stock Status
 */
export function StockBadge({
  stock,
  minimumStock,
  showCount = false,
}: {
  stock: number;
  minimumStock: number;
  showCount?: boolean;
}) {
  if (stock <= 0) {
    return (
      <Badge variant="danger" withDot>
        Habis{showCount ? " (0)" : ""}
      </Badge>
    );
  }
  if (stock <= minimumStock) {
    return (
      <Badge variant="warning" withDot>
        Menipis{showCount ? ` (${stock})` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="success" withDot>
      Aman{showCount ? ` (${stock})` : ""}
    </Badge>
  );
}
