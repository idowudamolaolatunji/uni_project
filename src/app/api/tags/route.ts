import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { TagModel } from "@/lib/models/Tag";

const MAX_TAGS = 500;
const MAX_TAG_LENGTH = 40;

const DEFAULT_TAGS = [
  "algorithms",
  "data structures",
  "machine learning",
  "databases",
  "web development",
  "operating systems",
  "networking",
  "security",
  "software engineering",
  "artificial intelligence",
  "mathematics",
  "statistics",
];

const DEFAULT_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();

  const count = await TagModel.countDocuments();
  if (count === 0) {
    try {
      await TagModel.insertMany(
        DEFAULT_TAGS.map((name) => ({ name })),
        { ordered: false }
      );
    } catch {
      // Another request may have already seeded these tags concurrently; ignore duplicate-key errors.
    }
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_TAGS)
      : DEFAULT_PAGE_SIZE;

  const total = await TagModel.countDocuments();
  const tags = await TagModel.find({}).sort({ name: 1 }).limit(limit).lean();
  return NextResponse.json({ tags: tags.map((tag) => tag.name), total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body as { name?: string };
  const normalized = name?.trim().toLowerCase();

  if (!normalized) {
    return NextResponse.json({ error: "Tag name is required." }, { status: 400 });
  }
  if (normalized.length > MAX_TAG_LENGTH) {
    return NextResponse.json(
      { error: `Tag name must be ${MAX_TAG_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const existing = await TagModel.findOne({ name: normalized });
  if (existing) {
    return NextResponse.json({ tag: existing.name });
  }

  const count = await TagModel.countDocuments();
  if (count >= MAX_TAGS) {
    return NextResponse.json(
      { error: `The tag limit of ${MAX_TAGS} has been reached.` },
      { status: 400 }
    );
  }

  const tag = await TagModel.create({ name: normalized });
  return NextResponse.json({ tag: tag.name }, { status: 201 });
}
