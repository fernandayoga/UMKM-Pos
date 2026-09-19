# 🛒 UMKM POS & Inventory Management System

Aplikasi Kasir (Point of Sale) dan Manajemen Inventori berbasis web yang dirancang khusus untuk memenuhi kebutuhan operasional toko ritel dan pelaku Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia. Dilengkapi dengan asisten bisnis cerdas bertenaga **AI (OpenRouter LLM)** dan penyimpanan foto produk berbasis cloud (**Cloudinary**).

---

## 📌 Daftar Isi
- [Spesifikasi Teknis](#-spesifikasi-teknis)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Fitur Utama](#-fitur-utama)
- [Struktur Direktori](#-struktur-direktori)
- [Prasyarat Sistem](#-prasyarat-sistem)
- [Panduan Instalasi & Menjalankan Aplikasi](#-panduan-instalasi--menjalankan-aplikasi)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Konfigurasi Environment Variables (.env.local)](#3-konfigurasi-environment-variables-envlocal)
  - [4. Seeding Data Awal (Opsional)](#4-seeding-data-awal-opsional)
  - [5. Menjalankan Server Development](#5-menjalankan-server-development)
  - [6. Membangun Versi Produksi (Production Build)](#6-membangun-versi-produksi-production-build)
- [Akun Pengguna Default](#-akun-pengguna-default)
- [Lisensi](#-lisensi)

---

## ⚙️ Spesifikasi Teknis

- **Arsitektur**: Server-Side Rendering (SSR) & Client-Side Rendering (CSR) via Next.js App Router
- **Database**: NoSQL MongoDB (Mongoose ODM)
- **Autentikasi**: JSON Web Token (JWT) Session via NextAuth.js
- **Keamanan**: Role-Based Access Control (RBAC) via Next.js Middleware & Password Hashing (Bcrypt)
- **Format Finansial**: Standar Mata Uang Rupiah Indonesia (`Rp`), kalkulasi margin laba, dan HPP (Harga Pokok Penjualan)
- **Tampilan Antarmuka**: Responsif (Desktop, Tablet, dan Mobile) dengan palet tema Dark Charcoal Pine & Emerald

---

## 💻 Teknologi yang Digunakan

### Frontend
- **[Next.js 15 (App Router)](https://nextjs.org/)**: Framework React modern dengan optimasi performa tinggi.
- **[React 19](https://react.dev/)**: Library UI komponen interaktif terbaru.
- **[TypeScript](https://www.typescriptlang.org/)**: Static type-checking untuk kode yang aman dan minim bug.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework untuk styling yang cepat dan konsisten.
- **[Lucide React](https://lucide.dev/)**: Icon set modern dan ringan.
- **[Recharts](https://recharts.org/)**: Library visualisasi grafik analitik bisnis dan tren penjualan.

### Backend & Database
- **[Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)**: RESTful API terintegrasi langsung di dalam proyek.
- **[MongoDB](https://www.mongodb.com/)** & **[Mongoose](https://mongoosejs.com/)**: Penyimpanan data dokumen fleksibel dan performan.
- **[NextAuth.js](https://next-auth.js.org/)**: Solusi autentikasi aman dengan session berbasis JWT.
- **[Bcryptjs](https://www.npmjs.com/package/bcryptjs)**: Enkripsi satu arah untuk keamanan kata sandi pengguna.

### Layanan Cloud & AI Eksternal
- **[Cloudinary](https://cloudinary.com/)**: Manajemen dan penyimpanan file media/gambar produk (Client-side Unsigned Upload, anti-crop).
- **[OpenRouter AI](https://openrouter.ai/)**: Akses ke model LLM gratis (Tool Calling / Function Calling terhubung langsung ke database MongoDB toko).

---

## 🌟 Fitur Utama

### 1. 🏪 Kasir Interaktif (Point of Sale / POS)
- **Tampilan Grid 3 Kolom**: Kartu produk rapi, compact, dan proporsional dengan gambar anti-crop (`object-contain`).
- **Mode List View**: Alternatif tampilan daftar horizontal yang dioptimalkan untuk kasir cepat dan pemindaian barcode/SKU.
- **Filter Kategori & Pencarian Cepat**: Menemukan produk berdasarkan nama atau kode SKU secara instan.
- **Keranjang Belanja Real-Time**: Kontrol kuantiti langsung (`+` dan `-`) dengan proteksi batas stok fisik.
- **Kalkulasi Otomatis**: Menghitung subtotal, diskon fleksibel, dan pajak secara akurat.
- **Modal Pembayaran Tunai Instan**: Rekomendasi pecahan uang pas (quick cash buttons) dan kalkulasi kembalian otomatis.
- **Nota Penjualan**: Tampilan struk digital siap pakai.

### 2. 📦 Katalog & Manajemen Produk
- Pencatatan produk lengkap: Nama, SKU otomatis/manual, Kategori, Satuan (`pcs`, `pack`, `kg`, dll).
- Penetapan Harga Beli (HPP/Cost Price) dan Harga Jual (Selling Price) dengan kalkulasi estimasi margin keuntungan.
- Penentuan batas minimum stok (*minimum stock alert*).
- **Upload Gambar Produk Cloudinary**: Unggah foto langsung dari browser dengan pratinjau instan.

### 3. 📊 Manajemen Stok & Inventori
- **Stock In**: Penerimaan barang masuk dari supplier dengan riwayat faktur.
- **Stock Adjustment**: Penyesuaian stok fisik akibat barang rusak, kedaluwarsa, hilang, atau koreksi opname.
- **Mutasi Stok (Stock Movements)**: Log riwayat keluar-masuk barang secara transparan dan kronologis.
- **Peringatan Stok Menipis**: Deteksi otomatis barang yang berada di bawah ambang batas minimum.

### 4. 📈 Laporan & Analitik Bisnis
- Ringkasan performa penjualan harian, mingguan, dan bulanan.
- Analisis perolehan Omzet kotor vs Estimasi Laba Bersih (Gross Profit).
- Grafik tren transaksi dan daftar **Produk Terlaris (Best Sellers)**.

### 5. 🤖 AI Business Assistant (OpenRouter Live DB)
- **Terkoneksi Database Toko**: Memanggil database langsung (Function Calling) untuk memberikan data faktual (bukan halusinasi angka).
- **Konsultasi Bisnis**: Menganalisis produk paling diminati, deteksi risiko kehabisan stok, hingga rekomendasi strategi bundling dan promosi kasir.
- **Format Percakapan Rapi**: Disajikan dalam bullet point terstruktur, kartu metrik, dan sorotan teks tebal tanpa tabel yang memotong layar drawer.

### 6. 👥 Manajemen Pengguna & Hak Akses (RBAC)
- **Role Owner**: Memiliki kendali penuh ke seluruh sistem, termasuk laporan keuangan, pengaturan toko, dan penambahan akun staf.
- **Role Cashier**: Dikhususkan untuk operasional kasir (POS), riwayat penjualan, dan katalog produk; rute sensitif otomatis dibatasi via Middleware.

---

## 📁 Struktur Direktori

```text
├── public/                     # Aset publik (favicon, logo, placeholder)
├── scripts/                    # Skrip seeding database
│   └── seed.ts
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Halaman autentikasi (/login)
│   │   ├── (dashboard)/        # Halaman dashboard berotentikasi
│   │   │   ├── inventory/      # Kelola stok, mutasi, dan stock-in
│   │   │   ├── pos/            # Halaman kasir (Point of Sale)
│   │   │   ├── products/       # Katalog & manajemen produk
│   │   │   ├── reports/        # Laporan keuangan & analitik
│   │   │   ├── sales/          # Riwayat transaksi penjualan
│   │   │   ├── settings/       # Pengaturan toko
│   │   │   └── users/          # Manajemen staf & pengguna
│   │   ├── api/                # API Route Handlers (auth, products, sales, ai, dll)
│   │   ├── globals.css         # Styling global Tailwind
│   │   └── layout.tsx          # Root layout aplikasi
│   ├── components/             # Komponen reusable
│   │   ├── ai/                 # AIAssistantDrawer & MarkdownMessage parser
│   │   ├── layout/             # Sidebar tema Dark Charcoal Pine & Topbar
│   │   └── ui/                 # Komponen dasar (Button, Modal, Input, Badge)
│   ├── lib/                    # Utilitas & logika bisnis
│   │   ├── ai-tools.ts         # Definisi tool database untuk AI
│   │   ├── auth.ts             # Opsi NextAuth.js
│   │   ├── mongodb.ts          # Koneksi database Mongoose
│   │   ├── session.ts          # Helper otorisasi sesi & peran
│   │   └── utils.ts            # Format rupiah, tanggal, dan kalkulasi
│   ├── models/                 # Mongoose Data Models
│   │   ├── Category.ts
│   │   ├── InventoryMovement.ts
│   │   ├── Product.ts
│   │   ├── Sale.ts
│   │   ├── Supplier.ts
│   │   └── User.ts
│   ├── types/                  # Definisi TypeScript interface & types
│   └── middleware.ts           # Proteksi route & validasi peran JWT
├── .env.example                # Template variabel lingkungan
├── next.config.ts              # Konfigurasi Next.js
├── package.json                # Daftar dependensi & script proyek
├── tailwind.config.ts          # Konfigurasi Tailwind CSS
└── tsconfig.json               # Konfigurasi TypeScript compiler
```

---

## 📋 Prasyarat Sistem

Sebelum memulai instalasi, pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `18.18.0` atau yang lebih baru (disarankan Node.js `v20.x` atau `v22.x` LTS).
- **NPM** atau **Yarn** / **PNPM** (biasanya terpasang otomatis bersama Node.js).
- **Git**: Untuk meng-clone repositori kode.
- **MongoDB**: Akses ke database MongoDB lokal (`mongodb://127.0.0.1:27017`) atau [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud Cluster gratis).
- **Akun Cloudinary** *(Opsional tapi disarankan)*: Akun gratis di [cloudinary.com](https://cloudinary.com) untuk fitur upload foto produk.
- **Akun OpenRouter** *(Opsional tapi disarankan)*: Akun di [openrouter.ai](https://openrouter.ai) untuk kunci API AI Assistant gratis.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah berikut secara berurutan:

### 1. Clone Repository
Buka terminal (Git Bash, Command Prompt, atau PowerShell) dan clone repositori ini:
```bash
git clone https://github.com/fernandayoga/UMKM-Pos.git
cd UMKM-Pos
```

### 2. Install Dependencies
Pasang semua paket dependensi yang dibutuhkan:
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env.local`)
Buat file konfigurasi `.env.local` di root direktori proyek. Anda dapat menduplikat dari `.env.example`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# Linux / macOS
cp .env.example .env.local
```

Buka file `.env.local` menggunakan teks editor Anda dan sesuaikan isinya:

```env
# 1. Koneksi Database MongoDB (Gunakan URI lokal atau URI Cloud MongoDB Atlas Anda)
MONGODB_URI=mongodb://127.0.0.1:27017/umkm_pos

# 2. Konfigurasi NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=rahasia-jwt-super-aman-ganti-dengan-string-bebas-acak

# 3. Integrasi AI Assistant (OpenRouter Free Model)
# Dapatkan API Key di https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openrouter/free

# 4. Integrasi Upload Gambar Cloudinary
# Dapatkan Cloud Name di Dashboard dan buat Upload Preset bertipe "Unsigned" di Settings > Upload
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nama_cloud_anda
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=nama_preset_unsigned_anda
```

> [!TIP]
> **Cara Mengaktifkan Upload Cloudinary:**
> 1. Masuk ke [cloudinary.com](https://cloudinary.com) dan catat **Cloud Name** di halaman konsol Anda.
> 2. Buka **Settings (⚙️)** > **Upload** > Gulir ke **Upload presets** > Klik **Add upload preset**.
> 3. Ubah **Signing Mode** menjadi **Unsigned**, beri nama (misal: `umkm_pos`), lalu klik **Save**.
> 4. Masukkan kedua nilai tersebut ke file `.env.local`.

---

### 4. Seeding Data Awal (Opsional)
Jika Anda ingin mengisi database baru dengan contoh data produk awal, kategori ritel, data supplier, dan akun default, jalankan skrip seeder:

```bash
npm run seed
```

Output sukses akan menampilkan konfirmasi bahwa koleksi default, akun pengguna, kategori, dan produk contoh telah terbuat.

---

### 5. Menjalankan Server Development
Jalankan server lokal dalam mode pengembang:

```bash
npm run dev
```

Buka peramban web (browser) Anda dan kunjungi:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 6. Membangun Versi Produksi (Production Build)
Untuk melakukan kompilasi dan menjalankan aplikasi dalam mode produksi:

```bash
# Melakukan build aplikasi Next.js
npm run build

# Menjalankan server hasil build
npm start
```

---

## 🔑 Akun Pengguna Default

Jika Anda telah menjalankan `npm run seed`, Anda dapat langsung login menggunakan salah satu akun berikut:

| Peran (Role) | Email | Password | Hak Akses Utama |
|---|---|---|---|
| **Pemilik Toko (Owner)** | `owner@example.com` | `owner123` | Akses penuh ke seluruh menu (Kasir, Produk, Stok, Laporan, Pengguna, Pengaturan) |
| **Staf Kasir (Cashier)** | `cashier@example.com` | `cashier123` | Akses Kasir (POS), Riwayat Transaksi, dan Katalog Produk |

---

## 🛡️ Lisensi & Kontribusi

Proyek ini dikembangkan untuk mempermudah digitalisasi sistem pencatatan toko dan ritel UMKM di Indonesia. Silakan kembangkan dan sesuaikan dengan kebutuhan alur bisnis toko Anda!
