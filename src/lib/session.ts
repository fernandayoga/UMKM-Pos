import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { UserRole } from "@/types";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Akses tidak diizinkan. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return { user: null, errorResponse };

  if (!user || !allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Akses ditolak. Fitur ini hanya dapat diakses oleh peran: " + allowedRoles.join(", ") },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
