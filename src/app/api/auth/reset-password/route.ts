import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, token, password } = body as {
    email?: string;
    token?: string;
    password?: string;
  };

  if (!email || !token || !password) {
    return NextResponse.json(
      { error: "Email, token, and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    "+resetPasswordTokenHash +resetPasswordExpires"
  );

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  if (
    !user ||
    !user.resetPasswordTokenHash ||
    user.resetPasswordTokenHash !== tokenHash ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return NextResponse.json({ success: true });
}
