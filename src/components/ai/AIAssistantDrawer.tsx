"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User as UserIcon, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([
    {
      id: "initial-welcome",
      role: "assistant",
      content:
        "Halo! Saya AI Business Assistant toko Anda. Saya dapat membantu menganalisis stok barang, total penjualan & laba kotor hari ini, serta produk paling laku langsung dari database toko.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Berapa penjualan hari ini?",
    "Produk apa yang stoknya rendah?",
    "Berapa stok Indomie?",
    "Produk terlaris minggu ini?",
    "Berapa ringkasan inventori toko?",
  ];

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user" as const,
      content: query.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungi AI Assistant.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            err.message ||
            "Maaf, terjadi kendala saat memproses pertanyaan Anda. Silakan coba lagi.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "cleared-welcome",
        role: "assistant",
        content:
          "Percakapan telah dibersihkan. Silakan tanyakan informasi seputar data bisnis toko Anda.",
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button in bottom-right corner */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Buka AI Business Assistant"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>AI Business Assistant</span>
      </button>

      {/* Slide-over Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                AI Business Assistant
              </h3>
              <p className="text-[10px] text-slate-500">
                Terhubung ke Data Toko MongoDB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Bersihkan Percakapan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Tutup Asisten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggested Quick Questions */}
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Pertanyaan Rekomendasi
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors text-left disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2.5 text-xs",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px]",
                  msg.role === "user"
                    ? "bg-slate-800 text-white"
                    : "bg-blue-100 text-blue-700"
                )}
              >
                {msg.role === "user" ? (
                  <UserIcon className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-xl max-w-[85%] leading-relaxed whitespace-pre-line text-xs font-normal",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-8 pt-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse delay-150" />
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse delay-300" />
              </div>
              <span className="text-[11px] font-medium">
                Mengambil data faktual toko dari MongoDB...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ketik pertanyaan bisnis (contoh: stok Indomie)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              aria-label="Kirim"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
