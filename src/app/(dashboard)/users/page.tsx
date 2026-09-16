"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, Edit2, Trash2, KeyRound, Shield, CheckCircle, XCircle } from "lucide-react";
import { IUser, UserRole } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { success, error: showError } = useToast();

  const [users, setUsers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as UserRole,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog
  const [userToDelete, setUserToDelete] = useState<IUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      showError("Gagal mengambil data pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (u: IUser) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "", // blank means keep current password
      role: u.role,
      isActive: u.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan akun pengguna.");
      }

      success(data.message || "Pengguna berhasil disimpan.");
      setIsFormOpen(false);
      loadUsers();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menyimpan pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus pengguna.");
      }

      success("Pengguna berhasil dihapus.");
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat menghapus pengguna.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Kelola Akun Kasir & Pengguna
          </h1>
          <p className="text-xs text-slate-500">
            Atur staf kasir yang dapat mengakses aplikasi kasir dan batasi hak akses pemilik toko (Owner)
          </p>
        </div>

        <Button onClick={handleOpenAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          <span>Tambah Akun</span>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-[0_3px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat daftar pengguna...
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada pengguna"
            description="Tambahkan akun kasir untuk mengoperasikan sistem POS di toko."
            actionLabel="+ Tambah Akun"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email Login</th>
                  <th className="py-3 px-4 text-center">Peran (Role)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u._id === currentUserId;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block text-xs">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            (Akun Anda Saat Ini)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {u.email}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            u.role === "owner"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {u.role === "owner" ? "Owner" : "Kasir"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            u.isActive ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(u.createdAt, false)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingUser ? "Edit Akun Pengguna" : "Tambah Akun Kasir Baru"}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Nama Lengkap *"
            placeholder="Contoh: Siti Rahma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Alamat Email *"
            type="email"
            placeholder="kasir@toko.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label={editingUser ? "Ganti Password (Kosongkan jika tidak diubah)" : "Password *"}
            type="password"
            placeholder="Minimal 6 karakter"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Peran Akun (Role) *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                disabled={editingUser?._id === currentUserId}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
              >
                <option value="cashier">Kasir (POS & Info Produk)</option>
                <option value="owner">Owner (Akses Penuh Bisnis)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Akun *
              </label>
              <select
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.value === "active" })
                }
                disabled={editingUser?._id === currentUserId}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
              >
                <option value="active">Aktif (Dapat Login)</option>
                <option value="inactive">Nonaktif (Dilarang Login)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingUser ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Akun Pengguna?"
        message={`Akun "${userToDelete?.name}" (${userToDelete?.email}) akan dihapus secara permanen.`}
        confirmText="Hapus Akun"
        isLoading={isDeleting}
      />
    </div>
  );
}
