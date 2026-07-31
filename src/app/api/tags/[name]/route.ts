import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { TagModel } from "@/lib/models/Tag";

type RouteParams = { params: Promise<{ name: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { name } = await params;
  const normalized = decodeURIComponent(name).trim().toLowerCase();

  await connectToDatabase();

  const tag = await TagModel.findOneAndDelete({ name: normalized });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
