"use client";

import React, { useState } from "react";
import { Settings, Store, Printer, Shield, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { success } = useToast();

  const [storeName, setStoreName] = useState("TOKO MAJU JAYA");
  const [storePhone, setStorePhone] = useState("081234567890");
  const [storeAddress, setStoreAddress] = useState("Surabaya, Jawa Timur - Indonesia");
  const [receiptFooter, setReceiptFooter] = useState("Terima kasih atas kunjungan Anda 🙏");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    success("Pengaturan profil toko berhasil diperbarui.");
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Pengaturan Toko & Profil
        </h1>
        <p className="text-xs text-slate-500">
          Konfigurasi identitas toko, format cetak nota kasir, dan parameter operasional bisnis
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Usaha */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Identitas Toko / Usaha UMKM
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nama Toko *"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />

            <Input
              label="Nomor Telepon / WhatsApp Toko"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
            />
          </div>

          <Input
            label="Alamat Toko"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
          />
        </div>

        {/* Format Nota Kasir */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Printer className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Pengaturan Cetak Nota (Receipt)
            </h2>
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Pesan Footer Struk Belanja
            </label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-[10px] text-slate-400">
              Teks ini akan tercetak di bagian paling bawah setiap nota pembelian thermal 58mm/80mm.
            </p>
          </div>
        </div>

        {/* Informasi Sistem & Keamanan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Keamanan & Lingkungan Sistem
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Database</span>
              <span className="font-semibold text-slate-800">MongoDB Atlas / Mongoose</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Autentikasi</span>
              <span className="font-semibold text-slate-800">NextAuth JWT Session</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px]">AI Engine</span>
              <span className="font-semibold text-slate-800">OpenRouter (Server-side Tools)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
