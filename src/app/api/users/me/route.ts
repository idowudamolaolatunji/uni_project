import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();

  const user = await UserModel.findById(
    session.user.id,
    "email role interests tags"
  ).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const { interests, tags } = body as {
    interests?: string[];
    tags?: string[];
  };

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (interests !== undefined) user.interests = interests;
  if (tags !== undefined) user.tags = tags;

  await user.save();

  return NextResponse.json({
    user: {
      interests: user.interests,
      tags: user.tags,
    },
  });
}
