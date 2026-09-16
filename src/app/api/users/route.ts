import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireRole } from "@/lib/session";
import { validateUserInput } from "@/lib/validations";

export async function GET() {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    await connectToDatabase();

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      users: users.map((u) => ({ ...u, _id: u._id.toString() })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = validateUserInput(body, false);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.sanitized;

    await connectToDatabase();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Gunakan email lain." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: `Pengguna ${name} (${role}) berhasil dibuat.`,
        user: {
          _id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menambahkan pengguna." },
      { status: 500 }
    );
  }
}
