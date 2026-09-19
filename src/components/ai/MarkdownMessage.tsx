"use client";

import React from "react";

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

// Format inline tokens: **bold**, *italic*, `code`
export function formatInline(text: string, isUser = false): React.ReactNode {
  if (!text) return null;

  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong
          key={match.index}
          className={isUser ? "font-bold text-white" : "font-semibold text-slate-900"}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className={
            isUser
              ? "px-1 py-0.5 rounded bg-emerald-700 font-mono text-[10.5px] text-white"
              : "px-1 py-0.5 rounded bg-slate-200/80 font-mono text-[10.5px] text-emerald-800"
          }
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface Block {
  type: "heading" | "bullet" | "numbered" | "quote" | "hr" | "table" | "paragraph" | "empty";
  level?: number;
  text?: string;
  num?: string;
  headers?: string[];
  rows?: string[][];
}

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push({ type: "empty" });
      i++;
      continue;
    }

    // Markdown Table detection: line starts and ends with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        const rows: string[][] = [];
        for (let r = 1; r < tableLines.length; r++) {
          const rowLine = tableLines[r];
          // Skip separator line like |---|---|
          if (/^\|[\s\-:|]+\|$/.test(rowLine)) continue;
          const cells = rowLine
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push(cells);
        }

        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    // Horizontal Rule
    if (/^---|\*\*\*|___$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^(#+)\s*(.*)$/);
      const level = match ? match[1].length : 1;
      const text = match ? match[2] : trimmed;
      blocks.push({ type: "heading", level, text });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const text = trimmed.replace(/^>\s*/, "");
      blocks.push({ type: "quote", text });
      i++;
      continue;
    }

    // Numbered list: e.g. 1. or 2.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: "numbered", num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // Bullet list: e.g. - or * or •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", text: bulletMatch[1] });
      i++;
      continue;
    }

    // Normal paragraph
    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
}

export function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-1 text-slate-800 text-[11.5px] leading-relaxed">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1 || block.level === 2) {
              return (
                <div
                  key={idx}
                  className="font-bold text-slate-900 text-xs mt-2.5 mb-1 pb-1 border-b border-slate-200/80 flex items-center gap-1.5"
                >
                  {formatInline(block.text || "", isUser)}
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="font-semibold text-slate-900 text-[11.5px] mt-2 mb-0.5 flex items-center gap-1"
              >
                {formatInline(block.text || "", isUser)}
              </div>
            );
          }

          case "hr":
            return <hr key={idx} className="my-2 border-slate-200/80" />;

          case "quote": {
            const isWarning =
              block.text?.includes("⚠️") ||
              block.text?.toLowerCase().includes("catatan") ||
              block.text?.toLowerCase().includes("perhatian");

            return (
              <div
                key={idx}
                className={`my-1.5 pl-2.5 py-1.5 border-l-2 rounded-r text-[11px] leading-relaxed ${
                  isWarning
                    ? "border-amber-500 bg-amber-50/80 text-amber-950 font-medium"
                    : "border-emerald-500 bg-emerald-50/70 text-emerald-950"
                }`}
              >
                {formatInline(block.text || "", isUser)}
              </div>
            );
          }

          case "bullet":
            return (
              <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-0.5">
                <span className="text-emerald-600 font-bold leading-none select-none text-[13px] mt-0.5">
                  •
                </span>
                <span className="flex-1 text-slate-700 leading-relaxed">
                  {formatInline(block.text || "", isUser)}
                </span>
              </div>
            );

          case "numbered":
            return (
              <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-0.5">
                <span className="font-bold text-emerald-700 text-[11px] select-none shrink-0 min-w-[16px] mt-0.5">
                  {block.num}.
                </span>
                <span className="flex-1 text-slate-700 leading-relaxed">
                  {formatInline(block.text || "", isUser)}
                </span>
              </div>
            );

          case "table": {
            return (
              <div
                key={idx}
                className="overflow-x-auto my-2 rounded-lg border border-slate-200 bg-white shadow-2xs"
              >
                <table className="w-full text-[11px] border-collapse min-w-[260px]">
                  {block.headers && block.headers.length > 0 && (
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-800 border-b border-slate-200">
                        {block.headers.map((header, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-2.5 py-1.5 text-left font-semibold text-slate-700 text-[10.5px]"
                          >
                            {formatInline(header, isUser)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  {block.rows && block.rows.length > 0 && (
                    <tbody className="divide-y divide-slate-100">
                      {block.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-2.5 py-1.5 text-slate-700 text-[10.5px]">
                              {formatInline(cell, isUser)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            );
          }

          case "empty":
            return <div key={idx} className="h-0.5" />;

          case "paragraph":
          default:
            return (
              <p key={idx} className="my-0.5 text-slate-700 leading-relaxed">
                {formatInline(block.text || "", isUser)}
              </p>
            );
        }
      })}
    </div>
  );
}
