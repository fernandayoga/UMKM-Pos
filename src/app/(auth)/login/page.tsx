"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Store, KeyRound, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan saat masuk. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand identity */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-sm mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            UMKM POS & Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Masuk ke sistem kasir & manajemen usaha toko
          </p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@toko.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Masuk ke Akun</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Demo credentials helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Akun Uji Coba (Demo)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleFillDemo("owner@example.com", "owner123")}
                className="p-2.5 text-left rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-blue-400 hover:shadow hover:bg-blue-50/40 transition-all text-xs"
              >
                <span className="font-semibold text-slate-800 block">Owner</span>
                <span className="text-[10px] text-slate-400">owner@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("cashier@example.com", "cashier123")}
                className="p-2.5 text-left rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-blue-400 hover:shadow hover:bg-blue-50/40 transition-all text-xs"
              >
                <span className="font-semibold text-slate-800 block">Kasir</span>
                <span className="text-[10px] text-slate-400">cashier@example.com</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Sistem Point of Sale & Inventori Terintegrasi
        </p>
      </div>
    </div>
  );
}
