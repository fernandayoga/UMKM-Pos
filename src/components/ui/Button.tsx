import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-sm",
          // Variants
          variant === "primary" &&
            "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 shadow-sm",
          variant === "secondary" &&
            "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
          variant === "outline" &&
            "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
          variant === "danger" &&
            "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600 shadow-sm",
          variant === "ghost" &&
            "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
          variant === "link" &&
            "text-blue-600 underline-offset-4 hover:underline p-0 h-auto",
          // Sizes
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-9 px-4 text-sm gap-2",
          size === "lg" && "h-11 px-5 text-base gap-2.5",
          size === "icon" && "h-9 w-9 p-0",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
