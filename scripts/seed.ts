import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";
import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { Supplier } from "../src/models/Supplier";
import { Sale } from "../src/models/Sale";
import { InventoryMovement } from "../src/models/InventoryMovement";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/umkm_pos";

async function runSeed() {
  console.log("🌱 Menghubungkan ke MongoDB untuk seeding...");
  let connUri = MONGODB_URI;

  try {
    await mongoose.connect(connUri, { serverSelectionTimeoutMS: 2000 });
  } catch {
    console.log("⚠️ Koneksi ke local daemon gagal, menggunakan MongoMemoryServer...");
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbName: "umkm_pos" } });
    connUri = mongod.getUri();
    await mongoose.connect(connUri);
  }

  console.log("Connected to:", connUri);

  // 1. Clear existing collections
  await User.deleteMany({});
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Supplier.deleteMany({});
  await Sale.deleteMany({});
  await InventoryMovement.deleteMany({});

  console.log("✓ Koleksi lama telah dibersihkan.");

  // 2. Create Users
  const ownerPassword = await bcrypt.hash("owner123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  const owner = await User.create({
    name: "Budi Santoso (Owner)",
    email: "owner@example.com",
    password: ownerPassword,
    role: "owner",
    isActive: true,
  });

  const cashier = await User.create({
    name: "Siti Rahma (Kasir)",
    email: "cashier@example.com",
    password: cashierPassword,
    role: "cashier",
    isActive: true,
  });

  console.log("✓ Akun default berhasil dibuat: owner@example.com & cashier@example.com");

  // 3. Create Categories
  const categoriesData = [
    { name: "Makanan", description: "Makanan instan, bahan pangan olahan" },
    { name: "Minuman", description: "Air mineral, teh, kopi, dan jus" },
    { name: "Snack", description: "Makanan ringan, biskuit, dan roti" },
    { name: "Sembako", description: "Beras, minyak, gula, dan telur" },
    { name: "ATK", description: "Alat tulis kantor dan perlengkapan sekolah" },
  ];

  const categories = await Category.insertMany(categoriesData);
  const categoryMap = new Map(categories.map((c) => [c.name, c._id]));
  console.log(`✓ ${categories.length} Kategori berhasil dibuat.`);

  // 4. Create Suppliers
  const suppliersData = [
    {
      name: "PT Indo Supplier",
      phone: "081234567890",
      email: "order@indosupplier.co.id",
      address: "Jl. Industri Raya No. 45, Surabaya",
      notes: "Pemasok aneka mie instan dan minuman kemasan",
    },
    {
      name: "CV Sumber Makmur",
      phone: "082198765432",
      email: "sales@sumbermakmur.com",
      address: "Komplek Pergudangan Margomulyo B-12, Surabaya",
      notes: "Distributor sembako, beras, minyak, dan gula pasir",
    },
  ];

  const suppliers = await Supplier.insertMany(suppliersData);
  console.log(`✓ ${suppliers.length} Supplier berhasil dibuat.`);

  // 5. Create Products
  const productsData = [
    {
      name: "Indomie Goreng",
      sku: "SKU-IND-01",
      categoryId: categoryMap.get("Makanan"),
      description: "Mie instan goreng rasa original 85g",
      costPrice: 2800,
      sellingPrice: 3500,
      stock: 45,
      minimumStock: 20,
      unit: "pcs",
      isActive: true,
    },
    {
      name: "Aqua 600ml",
      sku: "SKU-AQU-01",
      categoryId: categoryMap.get("Minuman"),
      description: "Air mineral botol pegunungan 600ml",
      costPrice: 2500,
      sellingPrice: 3500,
      stock: 32,
      minimumStock: 15,
      unit: "bottle",
      isActive: true,
    },
    {
      name: "Teh Botol Sosro 250ml",
      sku: "SKU-TEH-01",
      categoryId: categoryMap.get("Minuman"),
      description: "Teh melati dalam kemasan botol",
      costPrice: 3000,
      sellingPrice: 4000,
      stock: 8, // Low Stock! (minimum 15)
      minimumStock: 15,
      unit: "bottle",
      isActive: true,
    },
    {
      name: "Milo Kotak 180ml",
      sku: "SKU-MIL-01",
      categoryId: categoryMap.get("Minuman"),
      description: "Susu coklat malt energi",
      costPrice: 4500,
      sellingPrice: 6000,
      stock: 24,
      minimumStock: 10,
      unit: "box",
      isActive: true,
    },
    {
      name: "Roti Coklat Sari Roti",
      sku: "SKU-ROT-01",
      categoryId: categoryMap.get("Snack"),
      description: "Roti manis isi pasta coklat legit",
      costPrice: 4000,
      sellingPrice: 5500,
      stock: 4, // Low Stock!
      minimumStock: 10,
      unit: "pcs",
      isActive: true,
    },
    {
      name: "Kopi Kapal Api Special Mix",
      sku: "SKU-KOP-01",
      categoryId: categoryMap.get("Minuman"),
      description: "Kopi bubuk instan plus gula renceng",
      costPrice: 1500,
      sellingPrice: 2500,
      stock: 60,
      minimumStock: 20,
      unit: "pcs",
      isActive: true,
    },
    {
      name: "Beras Premium 5kg",
      sku: "SKU-BER-01",
      categoryId: categoryMap.get("Sembako"),
      description: "Beras pulen pilihan kualitas premium",
      costPrice: 68000,
      sellingPrice: 75000,
      stock: 14,
      minimumStock: 5,
      unit: "pack",
      isActive: true,
    },
    {
      name: "Minyak Goreng Bimoli 2L",
      sku: "SKU-MIN-01",
      categoryId: categoryMap.get("Sembako"),
      description: "Minyak goreng kelapa sawit pouch 2 liter",
      costPrice: 34000,
      sellingPrice: 38500,
      stock: 18,
      minimumStock: 10,
      unit: "pack",
      isActive: true,
    },
    {
      name: "Gula Pasir Gulaku 1kg",
      sku: "SKU-GUL-01",
      categoryId: categoryMap.get("Sembako"),
      description: "Gula tebu murni higienis 1000g",
      costPrice: 16000,
      sellingPrice: 18500,
      stock: 3, // Low Stock!
      minimumStock: 10,
      unit: "pack",
      isActive: true,
    },
    {
      name: "Buku Tulis Sinar Dunia 38 Lembar",
      sku: "SKU-ATK-01",
      categoryId: categoryMap.get("ATK"),
      description: "Buku tulis bergaris ukuran kwarto",
      costPrice: 3500,
      sellingPrice: 5000,
      stock: 50,
      minimumStock: 15,
      unit: "pcs",
      isActive: true,
    },
  ];

  const products = await Product.insertMany(productsData);
  console.log(`✓ ${products.length} Produk berhasil ditambahkan.`);

  // 6. Record Initial Inventory Movements for all products
  const initialMovements = products.map((p) => ({
    productId: p._id,
    type: "STOCK_IN",
    quantity: p.stock,
    previousStock: 0,
    newStock: p.stock,
    note: "Stok awal saat inisialisasi sistem toko",
    createdBy: owner._id,
  }));
  await InventoryMovement.insertMany(initialMovements);

  // 7. Create Sample Sales to populate Reports & Dashboard charts immediately
  const indomie = products.find((p) => p.sku === "SKU-IND-01")!;
  const aqua = products.find((p) => p.sku === "SKU-AQU-01")!;
  const teh = products.find((p) => p.sku === "SKU-TEH-01")!;
  const milo = products.find((p) => p.sku === "SKU-MIL-01")!;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const sampleSales = [
    {
      invoiceNumber: "INV-20260914-1001",
      items: [
        {
          productId: indomie._id,
          productName: indomie.name,
          sku: indomie.sku,
          costPrice: indomie.costPrice,
          sellingPrice: indomie.sellingPrice,
          quantity: 4,
          subtotal: 14000,
        },
        {
          productId: aqua._id,
          productName: aqua.name,
          sku: aqua.sku,
          costPrice: aqua.costPrice,
          sellingPrice: aqua.sellingPrice,
          quantity: 2,
          subtotal: 7000,
        },
      ],
      subtotal: 21000,
      discount: 0,
      total: 21000,
      paymentMethod: "cash",
      paidAmount: 50000,
      changeAmount: 29000,
      cashierId: cashier._id,
      cashierName: cashier.name,
      createdAt: twoDaysAgo,
    },
    {
      invoiceNumber: "INV-20260915-1002",
      items: [
        {
          productId: indomie._id,
          productName: indomie.name,
          sku: indomie.sku,
          costPrice: indomie.costPrice,
          sellingPrice: indomie.sellingPrice,
          quantity: 6,
          subtotal: 21000,
        },
        {
          productId: teh._id,
          productName: teh.name,
          sku: teh.sku,
          costPrice: teh.costPrice,
          sellingPrice: teh.sellingPrice,
          quantity: 3,
          subtotal: 12000,
        },
      ],
      subtotal: 33000,
      discount: 3000,
      total: 30000,
      paymentMethod: "qris",
      paidAmount: 30000,
      changeAmount: 0,
      cashierId: cashier._id,
      cashierName: cashier.name,
      createdAt: yesterday,
    },
    {
      invoiceNumber: "INV-20260916-1003",
      items: [
        {
          productId: indomie._id,
          productName: indomie.name,
          sku: indomie.sku,
          costPrice: indomie.costPrice,
          sellingPrice: indomie.sellingPrice,
          quantity: 5,
          subtotal: 17500,
        },
        {
          productId: aqua._id,
          productName: aqua.name,
          sku: aqua.sku,
          costPrice: aqua.costPrice,
          sellingPrice: aqua.sellingPrice,
          quantity: 4,
          subtotal: 14000,
        },
        {
          productId: milo._id,
          productName: milo.name,
          sku: milo.sku,
          costPrice: milo.costPrice,
          sellingPrice: milo.sellingPrice,
          quantity: 2,
          subtotal: 12000,
        },
      ],
      subtotal: 43500,
      discount: 0,
      total: 43500,
      paymentMethod: "cash",
      paidAmount: 50000,
      changeAmount: 6500,
      cashierId: cashier._id,
      cashierName: cashier.name,
      createdAt: today,
    },
  ];

  for (const s of sampleSales) {
    await Sale.create(s);
    // Add sale movement log
    for (const it of s.items) {
      await InventoryMovement.create({
        productId: it.productId,
        type: "SALE",
        quantity: -it.quantity,
        previousStock: 50,
        newStock: 50 - it.quantity,
        referenceId: s.invoiceNumber,
        note: `Penjualan Kasir (${s.invoiceNumber})`,
        createdBy: cashier._id,
        createdAt: s.createdAt,
      });
    }
  }

  console.log(`✓ ${sampleSales.length} Transaksi penjualan awal berhasil dibuat.`);
  console.log("\n🎉 Seeding database UMKM POS & Inventory selesai dengan sukses!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Error saat seeding:", err);
  process.exit(1);
});
