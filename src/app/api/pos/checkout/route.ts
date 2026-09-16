import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";
import { InventoryMovement } from "@/models/InventoryMovement";
import { requireAuth } from "@/lib/session";
import { validateCheckoutInput } from "@/lib/validations";
import { generateInvoiceNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateCheckoutInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const { items: cartItems, discount, paymentMethod, paidAmount, note } = validation.sanitized;

    await connectToDatabase();

    // 1. Fetch products from MongoDB and verify stocks and prices server-side
    const productIds = cartItems.map((it: any) => it.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (dbProducts.length !== cartItems.length) {
      return NextResponse.json(
        { error: "Satu atau lebih produk dalam keranjang tidak ditemukan atau tidak aktif." },
        { status: 400 }
      );
    }

    const productMap = new Map<string, any>();
    dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

    // 2. Validate stock availability for each item
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produk ID ${item.productId} tidak valid.` },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `Stok produk "${product.name}" tidak mencukupi. Sisa stok tersedia: ${product.stock} ${product.unit}. Permintaan: ${item.quantity} ${product.unit}.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Compute totals using real database prices (ignoring any client prices)
    let calculatedSubtotal = 0;
    const saleItems = cartItems.map((item: any) => {
      const product = productMap.get(item.productId);
      const subtotal = product.sellingPrice * item.quantity;
      calculatedSubtotal += subtotal;

      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        quantity: item.quantity,
        subtotal,
      };
    });

    const finalDiscount = Math.min(discount, calculatedSubtotal);
    const calculatedTotal = Math.max(0, calculatedSubtotal - finalDiscount);

    // 4. Validate payment amount for cash
    if (paymentMethod === "cash" && paidAmount < calculatedTotal) {
      return NextResponse.json(
        {
          error: `Nominal pembayaran tunai kurang dari total belanja. Total: Rp ${calculatedTotal.toLocaleString(
            "id-ID"
          )}, Pembayaran: Rp ${paidAmount.toLocaleString("id-ID")}.`,
        },
        { status: 400 }
      );
    }

    const changeAmount = paymentMethod === "cash" ? Math.max(0, paidAmount - calculatedTotal) : 0;
    const actualPaidAmount = paymentMethod === "cash" ? paidAmount : calculatedTotal;

    // 5. Generate invoice number and ensure uniqueness
    let invoiceNumber = generateInvoiceNumber();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await Sale.findOne({ invoiceNumber });
      if (!existing) {
        isUnique = true;
      } else {
        invoiceNumber = generateInvoiceNumber();
        attempts++;
      }
    }

    // 6. Deduct stock atomically and log InventoryMovement
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      // Decrement stock in MongoDB with condition stock >= quantity
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        return NextResponse.json(
          {
            error: `Gagal memproses transaksi: stok produk "${product.name}" berubah saat checkout. Silakan periksa kembali keranjang.`,
          },
          { status: 409 }
        );
      }

      // Log movement SALE
      await InventoryMovement.create({
        productId: product._id,
        type: "SALE",
        quantity: -item.quantity,
        previousStock,
        newStock,
        referenceId: invoiceNumber,
        note: `Penjualan Kasir (${invoiceNumber})`,
        createdBy: user?.id,
      });
    }

    // 7. Save Sale document
    const newSale = await Sale.create({
      invoiceNumber,
      items: saleItems,
      subtotal: calculatedSubtotal,
      discount: finalDiscount,
      total: calculatedTotal,
      paymentMethod,
      paidAmount: actualPaidAmount,
      changeAmount,
      cashierId: user?.id,
      cashierName: user?.name || "Kasir",
      note,
    });

    return NextResponse.json(
      {
        message: "Transaksi berhasil diselesaikan.",
        sale: newSale,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses transaksi checkout." },
      { status: 500 }
    );
  }
}
