export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized?: T;
}

/**
 * Validate Product Data
 */
export function validateProductInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.name = "Nama produk minimal 2 karakter.";
  }

  if (!data.categoryId || typeof data.categoryId !== "string") {
    errors.categoryId = "Kategori produk wajib dipilih.";
  }

  const costPrice = Number(data.costPrice);
  if (isNaN(costPrice) || costPrice < 0) {
    errors.costPrice = "Harga modal tidak boleh bernilai negatif.";
  }

  const sellingPrice = Number(data.sellingPrice);
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    errors.sellingPrice = "Harga jual harus lebih dari Rp 0.";
  }

  const stock = Number(data.stock ?? 0);
  if (isNaN(stock) || stock < 0) {
    errors.stock = "Jumlah stok tidak boleh bernilai negatif.";
  }

  const minimumStock = Number(data.minimumStock ?? 5);
  if (isNaN(minimumStock) || minimumStock < 0) {
    errors.minimumStock = "Minimum stok tidak boleh bernilai negatif.";
  }

  const allowedUnits = ["pcs", "box", "kg", "liter", "bottle", "pack"];
  if (!data.unit || !allowedUnits.includes(data.unit)) {
    errors.unit = "Satuan harus salah satu dari: pcs, box, kg, liter, bottle, pack.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: String(data.name || "").trim(),
      sku: String(data.sku || "").trim().toUpperCase(),
      categoryId: String(data.categoryId || "").trim(),
      description: String(data.description || "").trim(),
      image: String(data.image || "").trim(),
      costPrice,
      sellingPrice,
      stock,
      minimumStock,
      unit: data.unit,
      isActive: data.isActive !== false,
    },
  };
}

/**
 * Validate Category Data
 */
export function validateCategoryInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.name = "Nama kategori minimal 2 karakter.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
    },
  };
}

/**
 * Validate Supplier Data
 */
export function validateSupplierInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.name = "Nama supplier minimal 2 karakter.";
  }

  if (data.email && typeof data.email === "string" && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = "Format email tidak valid.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: String(data.name || "").trim(),
      phone: String(data.phone || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      address: String(data.address || "").trim(),
      notes: String(data.notes || "").trim(),
    },
  };
}

/**
 * Validate POS Checkout Payload
 */
export function validateCheckoutInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.items = "Keranjang belanja tidak boleh kosong.";
  } else {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.productId) {
        errors[`items_${i}_productId`] = `Item #${i + 1} tidak memiliki ID produk.`;
      }
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors[`items_${i}_quantity`] = `Kuantiti item #${i + 1} harus bilangan bulat positif.`;
      }
    }
  }

  const validMethods = ["cash", "qris", "transfer"];
  if (!validMethods.includes(data.paymentMethod)) {
    errors.paymentMethod = "Metode pembayaran harus salah satu dari: cash, qris, atau transfer.";
  }

  const discount = Number(data.discount || 0);
  if (isNaN(discount) || discount < 0) {
    errors.discount = "Diskon tidak boleh negatif.";
  }

  const paidAmount = Number(data.paidAmount);
  if (isNaN(paidAmount) || paidAmount < 0) {
    errors.paidAmount = "Jumlah pembayaran tidak valid.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      items: (data.items || []).map((it: any) => ({
        productId: String(it.productId).trim(),
        quantity: Number(it.quantity),
      })),
      discount,
      paymentMethod: data.paymentMethod,
      paidAmount,
      note: String(data.note || "").trim(),
    },
  };
}

/**
 * Validate Stock In Input
 */
export function validateStockInInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.productId) errors.productId = "Produk wajib dipilih.";
  const qty = Number(data.quantity);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    errors.quantity = "Jumlah barang masuk harus bilangan bulat lebih dari 0.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: String(data.productId).trim(),
      supplierId: data.supplierId ? String(data.supplierId).trim() : undefined,
      quantity: qty,
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : undefined,
      note: String(data.note || "").trim(),
    },
  };
}

/**
 * Validate Stock Adjustment Input
 */
export function validateStockAdjustInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.productId) errors.productId = "Produk wajib dipilih.";
  const actualStock = Number(data.actualStock);
  if (isNaN(actualStock) || actualStock < 0 || !Number.isInteger(actualStock)) {
    errors.actualStock = "Stok fisik aktual harus berupa angka bulat 0 atau lebih.";
  }

  if (!data.reason || typeof data.reason !== "string" || data.reason.trim().length < 3) {
    errors.reason = "Alasan penyesuaian wajib diisi (minimal 3 karakter).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: String(data.productId).trim(),
      actualStock,
      reason: String(data.reason || "").trim(),
    },
  };
}

/**
 * Validate User Input (Registration/Add Cashier)
 */
export function validateUserInput(data: any, isUpdate = false): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.name = "Nama lengkap minimal 2 karakter.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(String(data.email).trim())) {
    errors.email = "Email tidak valid.";
  }

  if (!isUpdate || (data.password && data.password.length > 0)) {
    if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
      errors.password = "Password minimal 6 karakter.";
    }
  }

  if (data.role && !["owner", "cashier"].includes(data.role)) {
    errors.role = "Role harus owner atau cashier.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      password: data.password ? String(data.password) : undefined,
      role: data.role || "cashier",
      isActive: data.isActive !== false,
    },
  };
}
