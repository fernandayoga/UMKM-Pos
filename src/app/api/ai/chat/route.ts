import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import {
  getProductStock,
  getLowStockProducts,
  getTodaySales,
  getSalesByDateRange,
  getTopSellingProducts,
  getProductProfit,
  getInventorySummary,
} from "@/lib/ai-tools";
import { formatRupiah } from "@/lib/utils";

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_product_stock",
      description: "Cek ketersediaan dan jumlah stok produk berdasarkan nama atau SKU.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama produk atau SKU, contoh: Indomie, Aqua" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_products",
      description: "Ambil daftar semua produk yang stoknya menipis atau habis (stok <= minimum stock).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_sales",
      description: "Ambil data total penjualan, laba kotor, jumlah transaksi, dan produk terjual hari ini.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_products",
      description: "Ambil produk yang paling laris / terjual paling banyak dalam periode tertentu.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["all", "this_week", "this_month"],
            description: "Periode waktu",
          },
          limit: { type: "number", description: "Jumlah produk, default 5" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_profit",
      description: "Ambil laporan laba kotor produk teratas bulan ini.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["this_month", "all"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_summary",
      description: "Ambil ringkasan keseluruhan inventori toko (total valuasi stok, total unit, produk habis).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

async function executeTool(name: string, args: any) {
  switch (name) {
    case "get_product_stock":
      return await getProductStock(args.query || "");
    case "get_low_stock_products":
      return await getLowStockProducts();
    case "get_today_sales":
      return await getTodaySales();
    case "get_top_products":
      return await getTopSellingProducts(args.limit || 5, args.period || "this_week");
    case "get_product_profit":
      return await getProductProfit(args.period || "this_month");
    case "get_inventory_summary":
      return await getInventorySummary();
    default:
      return { error: `Tool ${name} tidak dikenali.` };
  }
}

/**
 * Fallback intent matcher if OpenRouter API Key is missing or rate-limited
 */
async function fallbackIntentHandler(question: string): Promise<string> {
  const q = question.toLowerCase();

  if (q.includes("stok") || q.includes("sisa")) {
    if (q.includes("rendah") || q.includes("menipis") || q.includes("habis") || q.includes("kurang")) {
      const data = await getLowStockProducts();
      if (data.products.length === 0) {
        return "Semua stok produk saat ini dalam kondisi aman (di atas minimum stock). Tidak ada produk yang menipis.";
      }
      const list = data.products
        .map((p) => `• ${p.name}: ${p.currentStock} ${p.unit} (Minimum: ${p.minimumStock}) [${p.status}]`)
        .join("\n");
      return `Ditemukan ${data.products.length} produk dengan stok menipis/habis:\n\n${list}\n\nSebaiknya segera jadwalkan Stock In dari supplier terkait.`;
    }

    // Check specific product stock
    const cleanWord = q
      .replace(/berapa|stok|sisa|produk|barang|toko|di|ada|tersedia|apakah|\?/gi, "")
      .trim();

    if (cleanWord.length >= 2) {
      const result = await getProductStock(cleanWord);
      if (!result.found || result.products.length === 0) {
        return `Maaf, produk "${cleanWord}" tidak ditemukan dalam database toko. Pastikan ejaan nama produk sudah benar.`;
      }
      const p = result.products[0];
      return `Informasi Stok ${p.name} (${p.sku}):\n• Stok saat ini: ${p.stock} ${p.unit}\n• Minimum stok: ${p.minimumStock} ${p.unit}\n• Harga jual: ${p.sellingPriceFormatted}\n• Status: ${
        p.isOutOfStock ? "Stok Habis" : p.isLowStock ? "Stok Menipis" : "Stok Aman"
      }`;
    }

    const summary = await getInventorySummary();
    return `Ringkasan Inventori Toko:\n• Total Produk: ${summary.totalProducts}\n• Total Fisik: ${summary.totalStockUnits} unit\n• Total Valuasi HPP: ${summary.totalInventoryValuationFormatted}\n• Produk Menipis: ${summary.lowStockCount}\n• Produk Habis: ${summary.outOfStockCount}`;
  }

  if (q.includes("penjualan") || q.includes("omzet") || q.includes("transaksi") || q.includes("laba") || q.includes("profit") || q.includes("untung")) {
    const today = await getTodaySales();
    return `Ringkasan Penjualan Hari Ini:\n• Total Pendapatan (Omzet): ${today.totalRevenueFormatted}\n• Jumlah Transaksi: ${today.totalTransactions} transaksi\n• Total Produk Terjual: ${today.totalItemsSold} pcs\n• Estimasi Laba Kotor: ${today.grossProfitFormatted}`;
  }

  if (q.includes("terlaris") || q.includes("paling laku") || q.includes("populer") || q.includes("favorit")) {
    const top = await getTopSellingProducts(5, "this_week");
    if (top.topProducts.length === 0) {
      return "Belum ada data penjualan tercatat untuk produk terlaris.";
    }
    const list = top.topProducts
      .map((p, idx) => `${idx + 1}. ${p.name} — ${p.totalSold} terjual (${p.totalRevenueFormatted})`)
      .join("\n");
    return `Produk Terlaris Minggu Ini:\n\n${list}`;
  }

  return `Halo! Saya asisten bisnis UMKM Anda. Anda bisa menanyakan hal-hal seperti:\n• "Berapa penjualan hari ini?"\n• "Produk apa yang stoknya menipis?"\n• "Berapa stok Indomie?"\n• "Produk terlaris minggu ini?"`;
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Pesan pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    // If OpenRouter API key is not configured, use the smart direct DB query handler
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes("your_openrouter")) {
      const reply = await fallbackIntentHandler(message);
      return NextResponse.json({ reply, source: "database_rules" });
    }

    // Call OpenRouter with Tool Calling
    try {
      const initialResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "UMKM POS Assistant",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Anda adalah AI Business Assistant untuk toko UMKM di Indonesia. Jawab pertanyaan pengguna HANYA berdasarkan data faktual yang didapatkan dari tools. JANGAN MENGARANG angka stok, omzet, transaksi, atau keuntungan. Jika data tidak ditemukan atau produk tidak ada, katakan secara jujur dan ramah. Gunakan format mata uang Rupiah (contoh: Rp 12.500) dan bahasa Indonesia yang sopan, ringkas, dan jelas.",
            },
            { role: "user", content: message },
          ],
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
        }),
      });

      if (!initialResponse.ok) {
        // Fallback gracefully to direct query if OpenRouter returns error
        const reply = await fallbackIntentHandler(message);
        return NextResponse.json({ reply, source: "fallback_database" });
      }

      const initialData = await initialResponse.json();
      const choice = initialData.choices?.[0]?.message;

      if (choice?.tool_calls && choice.tool_calls.length > 0) {
        // Execute tool called by OpenRouter
        const toolCall = choice.tool_calls[0];
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        const toolResult = await executeTool(toolCall.function.name, toolArgs);

        // Send tool response back to OpenRouter for final response formulation
        const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "UMKM POS Assistant",
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "Anda adalah AI Business Assistant untuk toko UMKM di Indonesia. Formulasikan jawaban yang profesional, rapi, dan mudah dipahami berdasarkan data tools database yang diberikan. Selalu gunakan format Rupiah (contoh: Rp 12.500). Jangan menambahkan informasi fiktif di luar data.",
              },
              { role: "user", content: message },
              choice,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: JSON.stringify(toolResult),
              },
            ],
          }),
        });

        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          const finalReply = secondData.choices?.[0]?.message?.content || "";
          return NextResponse.json({ reply: finalReply, source: "openrouter_tool_calling" });
        }
      }

      if (choice?.content) {
        return NextResponse.json({ reply: choice.content, source: "openrouter" });
      }

      // If no valid content, use fallback
      const reply = await fallbackIntentHandler(message);
      return NextResponse.json({ reply, source: "fallback" });
    } catch (llmError) {
      // Graceful fallback to real database query
      const reply = await fallbackIntentHandler(message);
      return NextResponse.json({ reply, source: "fallback_rules" });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses pesan AI." },
      { status: 500 }
    );
  }
}
