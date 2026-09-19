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

import fs from "fs";
import path from "path";

// Helper to get fresh OpenRouter config directly from environment or .env.local
function getOpenRouterConfig() {
  let apiKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  let model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";

  if (!apiKey || apiKey.includes("your_openrouter")) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("OPENROUTER_API_KEY=")) {
            apiKey = trimmed.slice("OPENROUTER_API_KEY=".length).trim();
          }
          if (trimmed.startsWith("OPENROUTER_MODEL=")) {
            model = trimmed.slice("OPENROUTER_MODEL=".length).trim() || model;
          }
        }
      }
    } catch {}
  }
  return { apiKey, model };
}

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

  // 1. Inventory Summary query
  if (
    q.includes("inventori") ||
    q.includes("ringkasan") ||
    q.includes("gudang") ||
    q.includes("total barang") ||
    q.includes("keseluruhan produk")
  ) {
    const summary = await getInventorySummary();
    return `📦 **Ringkasan Inventori Toko**\n\n• **Total Produk**: ${summary.totalProducts} jenis produk\n• **Total Satuan Barang**: ${summary.totalStockUnits} unit\n• **Total Nilai Inventori (HPP)**: ${summary.totalInventoryValuationFormatted}\n• **Produk Stok Menipis**: ${summary.lowStockCount} produk\n• **Produk Stok Habis**: ${summary.outOfStockCount} produk\n\n💡 **Catatan & Rekomendasi:**\n• ${
      summary.lowStockCount > 0
        ? `Terdapat **${summary.lowStockCount} produk** yang mendekati batas minimum stok. Disarankan untuk segera melakukan restok (Stock In).`
        : "Semua stok produk saat ini dalam kondisi aman dan mencukupi."
    }`;
  }

  // 2. Business Insights & Recommendations
  if (
    q.includes("insight") ||
    q.includes("analisis") ||
    q.includes("rekomendasi") ||
    q.includes("saran") ||
    q.includes("evaluasi") ||
    q.includes("strategi")
  ) {
    const today = await getTodaySales();
    const top = await getTopSellingProducts(3, "this_week");
    const low = await getLowStockProducts();

    const topList =
      top.topProducts.length > 0
        ? top.topProducts.map((p, i) => `${i + 1}. **${p.name}** — ${p.totalSold} terjual (${p.totalRevenueFormatted})`).join("\n")
        : "Belum ada data penjualan tercatat.";

    return `💡 **Insight & Rekomendasi Bisnis Toko**\n\n📊 **Performa Penjualan Hari Ini:**\n• **Total Omzet**: ${today.totalRevenueFormatted} (${today.totalTransactions} transaksi, ${today.totalItemsSold} pcs terjual)\n• **Estimasi Laba Kotor**: ${today.grossProfitFormatted}\n\n🏆 **Produk Terlaris Minggu Ini:**\n${topList}\n\n💡 **Rekomendasi Praktis:**\n• ${
      low.count > 0
        ? `**Perhatian Stok**: Ada **${low.count} produk** dengan stok kritis. Segera hubungi supplier agar tidak kehilangan potensi transaksi.`
        : "Ketersediaan stok barang toko dalam kondisi aman."
    }\n• Pertahankan ketersediaan produk terlaris dan pertimbangkan strategi bundling paket kasir untuk meningkatkan nilai belanja pelanggan.`;
  }

  // 3. Stock queries
  if (q.includes("stok") || q.includes("sisa")) {
    if (q.includes("rendah") || q.includes("menipis") || q.includes("habis") || q.includes("kurang")) {
      const data = await getLowStockProducts();
      if (data.products.length === 0) {
        return "Semua stok produk saat ini dalam kondisi aman (di atas minimum stock). Tidak ada produk yang menipis.";
      }
      const list = data.products
        .map((p) => `• **${p.name}**: sisa **${p.currentStock} ${p.unit}** (Batas Minimum: ${p.minimumStock}) [${p.status}]`)
        .join("\n");
      return `⚠️ **Daftar Stok Menipis/Habis (${data.products.length} produk):**\n\n${list}\n\n💡 **Saran:** Segera jadwalkan Stock In dari supplier terkait.`;
    }

    // Check specific product stock
    const cleanWord = q
      .replace(/berapa|stok|sisa|produk|barang|toko|di|ada|tersedia|apakah|\?/gi, "")
      .trim();

    if (cleanWord.length >= 2) {
      const result = await getProductStock(cleanWord);
      if (!result.found || result.products.length === 0) {
        return `Maaf, produk "**${cleanWord}**" tidak ditemukan dalam database toko. Pastikan ejaan nama produk sudah benar.`;
      }
      const p = result.products[0];
      return `📦 **Informasi Stok: ${p.name}**\n\n• **SKU**: ${p.sku}\n• **Stok Saat Ini**: **${p.stock} ${p.unit}**\n• **Batas Minimum**: ${p.minimumStock} ${p.unit}\n• **Harga Jual**: **${p.sellingPriceFormatted}**\n• **Status**: **${
        p.isOutOfStock ? "Stok Habis" : p.isLowStock ? "Stok Menipis" : "Stok Aman"
      }**`;
    }

    const summary = await getInventorySummary();
    return `📦 **Ringkasan Inventori Toko:**\n\n• **Total Produk**: ${summary.totalProducts} jenis\n• **Total Satuan Barang**: ${summary.totalStockUnits} unit\n• **Total Valuasi HPP**: ${summary.totalInventoryValuationFormatted}\n• **Produk Menipis**: ${summary.lowStockCount}\n• **Produk Habis**: ${summary.outOfStockCount}`;
  }

  // 4. Sales & Profit queries
  if (q.includes("penjualan") || q.includes("omzet") || q.includes("transaksi") || q.includes("laba") || q.includes("profit") || q.includes("untung")) {
    const today = await getTodaySales();
    return `📊 **Ringkasan Penjualan Hari Ini:**\n\n• **Total Pendapatan (Omzet)**: **${today.totalRevenueFormatted}**\n• **Jumlah Transaksi**: **${today.totalTransactions} transaksi**\n• **Total Produk Terjual**: **${today.totalItemsSold} pcs**\n• **Estimasi Laba Kotor**: **${today.grossProfitFormatted}**`;
  }

  // 5. Best sellers
  if (q.includes("terlaris") || q.includes("paling laku") || q.includes("populer") || q.includes("favorit")) {
    const top = await getTopSellingProducts(5, "this_week");
    if (top.topProducts.length === 0) {
      return "Belum ada data penjualan tercatat untuk produk terlaris.";
    }
    const list = top.topProducts
      .map((p, idx) => `${idx + 1}. **${p.name}** — ${p.totalSold} terjual (**${p.totalRevenueFormatted}**)`)
      .join("\n");
    return `🏆 **Produk Terlaris Minggu Ini:**\n\n${list}`;
  }

  return `Halo! Saya AI Business Assistant toko Anda. Anda dapat menanyakan data bisnis seperti:\n• "Berapa ringkasan inventori toko?"\n• "Ada insight bisnis apa dari penjualan?"\n• "Berapa penjualan hari ini?"\n• "Produk apa yang stoknya menipis?"\n• "Berapa stok Indomie?"\n• "Produk terlaris minggu ini?"`;
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

    const { apiKey, model } = getOpenRouterConfig();

    // If OpenRouter API key is not configured, use the smart direct DB query handler
    if (!apiKey || apiKey.includes("your_openrouter")) {
      const reply = await fallbackIntentHandler(message);
      return NextResponse.json({ reply, source: "database_rules" });
    }

const SYSTEM_INSTRUCTION = `Anda adalah AI Business Assistant untuk toko UMKM di Indonesia.
Pedoman format jawaban (SANGAT PENTING):
1. DILARANG MENGGUNAKAN TABEL MARKDOWN (| Kolom 1 | Kolom 2 |) karena jendela obrolan (drawer) di layar kasir/HP sempit dan tabel akan terpotong serta berantakan.
2. Gunakan SELALU format bullet points (•) atau daftar nomor (1., 2., 3.) yang rapi, padat, dan mudah dibaca.
3. Cetak tebal (bold) setiap angka/metrik penting dan nama produk (contoh: **Rp 25.000**, **15 unit**, **Indomie Goreng**).
4. Pisahkan kelompok informasi dengan section teratur menggunakan emoji dan judul singkat (contoh: 📊 **Performa Penjualan**, 🏆 **Produk Terlaris**, ⚠️ **Peringatan Stok**, 💡 **Rekomendasi Bisnis**).
5. Jawab HANYA berdasarkan data faktual dari tools database toko (jangan mengarang data).
6. Selalu gunakan format mata uang Rupiah (contoh: Rp 12.500) dan bahasa Indonesia yang ramah, sopan, dan to-the-point.`;

    // Call OpenRouter with Tool Calling
    try {
      const initialResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "UMKM POS Assistant",
        },
        body: JSON.stringify({
          model: model || "openrouter/free",
          messages: [
            {
              role: "system",
              content: SYSTEM_INSTRUCTION,
            },
            { role: "user", content: message },
          ],
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
        }),
      });

      if (!initialResponse.ok) {
        const errorText = await initialResponse.text();
        console.warn("[OpenRouter] Initial error:", initialResponse.status, errorText);
        const reply = await fallbackIntentHandler(message);
        return NextResponse.json({ reply, source: "fallback_database" });
      }

      const initialData = await initialResponse.json();
      const choice = initialData.choices?.[0]?.message;

      if (choice?.tool_calls && choice.tool_calls.length > 0) {
        // Execute ALL tool calls requested by the model
        const toolResponses = [];
        for (const toolCall of choice.tool_calls) {
          try {
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const toolResult = await executeTool(toolCall.function.name, toolArgs);
            toolResponses.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(toolResult),
            });
          } catch (e: any) {
            toolResponses.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: e.message || "Gagal menjalankan tool" }),
            });
          }
        }

        // Send all tool responses back to OpenRouter for final synthesis
        const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "UMKM POS Assistant",
          },
          body: JSON.stringify({
            model: model || "openrouter/free",
            messages: [
              {
                role: "system",
                content: SYSTEM_INSTRUCTION,
              },
              { role: "user", content: message },
              choice,
              ...toolResponses,
              {
                role: "user",
                content:
                  "Rangkum data di atas secara ramah, profesional, dan ringkas. INGAT: JANGAN gunakan tabel Markdown (| Kolom |), gunakan daftar nomor/bullet point (•) yang bersih dan rapi.",
              },
            ],
          }),
        });

        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          const finalReply = secondData.choices?.[0]?.message?.content || "";
          if (finalReply) {
            return NextResponse.json({ reply: finalReply, source: "openrouter_tool_calling" });
          }
        } else {
          const errText = await secondResponse.text();
          console.warn("[OpenRouter] Tool completion error:", secondResponse.status, errText);
        }
      }

      if (choice?.content) {
        return NextResponse.json({ reply: choice.content, source: "openrouter" });
      }

      const reply = await fallbackIntentHandler(message);
      return NextResponse.json({ reply, source: "fallback" });
    } catch (llmError: any) {
      console.warn("[OpenRouter] Exception:", llmError?.message || llmError);
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
