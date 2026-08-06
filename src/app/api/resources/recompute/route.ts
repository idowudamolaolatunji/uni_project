import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recomputeAllTfidfVectors } from "@/lib/algorithms/recompute-vectors";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const updated = await recomputeAllTfidfVectors();
  return NextResponse.json({ updated });
}
