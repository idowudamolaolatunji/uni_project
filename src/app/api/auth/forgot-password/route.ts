import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { sendPasswordResetEmail } from "@/lib/mail";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  // Same response whether or not the user exists, so this endpoint can't be used to enumerate accounts.
  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
