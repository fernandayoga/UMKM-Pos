"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Truck, Plus, Edit2, Trash2, History, Phone, Mail, MapPin } from "lucide-react";
import { ISupplier } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function SuppliersPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "owner";

  const { success, error: showError } = useToast();

  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ISupplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supply History Modal
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<ISupplier | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Delete Dialog
  const [supplierToDelete, setSupplierToDelete] = useState<ISupplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (data.suppliers) setSuppliers(data.suppliers);
    } catch {
      showError("Gagal mengambil data supplier.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: ISupplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleOpenHistory = async (s: ISupplier) => {
    setSelectedSupplierForHistory(s);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/suppliers/${s._id}`);
      const data = await res.json();
      if (data.history) setHistoryItems(data.history);
    } catch {
      showError("Gagal mengambil riwayat pasokan supplier.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier._id}`
        : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan data supplier.");
      }

      success(
        editingSupplier
          ? "Data supplier berhasil diperbarui."
          : "Supplier baru berhasil ditambahkan."
      );
      setIsFormOpen(false);
      loadSuppliers();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menyimpan supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus supplier.");
      }

      success("Data supplier berhasil dihapus.");
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menghapus supplier.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Supplier
          </h1>
          <p className="text-xs text-slate-500">
            Kelola data pemasok barang dagangan dan pantau riwayat stok masuk dari distributor
          </p>
        </div>

        {isOwner && (
          <Button onClick={handleOpenAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            <span>Tambah Supplier</span>
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat daftar supplier...
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Belum ada data supplier"
            description="Tambahkan mitra pemasok barang dagangan toko Anda untuk memudahkan pencatatan Stock In."
            actionLabel={isOwner ? "+ Tambah Supplier" : undefined}
            onAction={isOwner ? handleOpenAdd : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5">Nama Supplier</th>
                  <th className="py-2.5 px-3.5">Kontak (Telepon & Email)</th>
                  <th className="py-2.5 px-3.5">Alamat Gudang / Kantor</th>
                  <th className="py-2.5 px-3.5">Catatan Pasokan</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                      {s.name}
                    </td>

                    <td className="py-2.5 px-3.5 space-y-0.5">
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-[11px]">{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {!s.phone && !s.email && <span className="text-slate-400">-</span>}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">
                      {s.address || "-"}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 max-w-xs truncate">
                      {s.notes || "-"}
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(s)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Lihat Riwayat Pasokan"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Edit Supplier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSupplierToDelete(s)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Supplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Supplier */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? "Edit Data Supplier" : "Tambah Supplier Baru"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Nama Supplier / Distributor *"
            placeholder="Contoh: PT Indo Supplier"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nomor Telepon / WhatsApp"
              placeholder="08123456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Alamat Email"
              type="email"
              placeholder="sales@supplier.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Alamat Kantor / Gudang"
            placeholder="Jl. Raya Pergudangan No. 12"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Catatan Khusus
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Pemasok produk tertentu, jadwal pengiriman, syarat pembayaran, dll."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingSupplier ? "Simpan Perubahan" : "Simpan Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal History Pasokan */}
      <Modal
        isOpen={!!selectedSupplierForHistory}
        onClose={() => setSelectedSupplierForHistory(null)}
        title={`Riwayat Pasokan — ${selectedSupplierForHistory?.name}`}
        description="Daftar penerimaan barang masuk (Stock In) dari supplier ini."
        maxWidth="lg"
      >
        <div className="space-y-3">
          {isLoadingHistory ? (
            <p className="text-center py-6 text-xs text-slate-400">
              Memuat riwayat pasokan...
            </p>
          ) : historyItems.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              Belum ada riwayat penerimaan barang masuk dari supplier ini.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Produk</th>
                    <th className="py-2.5 px-3 text-right">Jumlah Masuk</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyItems.map((h) => (
                    <tr key={h._id}>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(h.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {h.productId?.name || "Produk"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        +{h.quantity} {h.productId?.unit || "pcs"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{h.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSupplierForHistory(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Supplier?"
        message={`Data supplier "${supplierToDelete?.name}" akan dihapus secara permanen.`}
        confirmText="Hapus Supplier"
        isLoading={isDeleting}
      />
    </div>
  );
}
