import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  let uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

  if (!cloudName || !uploadPreset) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=")) {
            cloudName = trimmed.slice("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=".length).trim();
          }
          if (trimmed.startsWith("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=")) {
            uploadPreset = trimmed.slice("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=".length).trim();
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ cloudName, uploadPreset });
}
