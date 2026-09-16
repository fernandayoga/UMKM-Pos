import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireRole } from "@/lib/session";
import { validateUserInput } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json();
    const validation = validateUserInput(body, true);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: Object.values(validation.errors)[0], errors: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Check duplicate email on another user
    const existingEmail = await User.findOne({
      _id: { $ne: id },
      email: validation.sanitized.email,
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email sudah digunakan oleh pengguna lain." },
        { status: 400 }
      );
    }

    // If user is editing own self, don't allow deactivating or removing owner role
    if (currentUser?.id === id) {
      if (validation.sanitized.isActive === false) {
        return NextResponse.json(
          { error: "Anda tidak dapat menonaktifkan akun Anda sendiri." },
          { status: 400 }
        );
      }
      if (validation.sanitized.role !== "owner") {
        return NextResponse.json(
          { error: "Anda tidak dapat menghapus hak akses Owner dari akun Anda sendiri." },
          { status: 400 }
        );
      }
    }

    targetUser.name = validation.sanitized.name;
    targetUser.email = validation.sanitized.email;
    targetUser.role = validation.sanitized.role;
    targetUser.isActive = validation.sanitized.isActive;

    if (validation.sanitized.password) {
      targetUser.password = await bcrypt.hash(validation.sanitized.password, 10);
    }

    await targetUser.save();

    return NextResponse.json({
      message: "Data pengguna berhasil diperbarui.",
      user: {
        _id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, errorResponse } = await requireRole(["owner"]);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (currentUser?.id === id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Pengguna berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
