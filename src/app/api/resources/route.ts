import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { uploadResourceFile } from "@/lib/cloudinary";
import { tokenize } from "@/lib/algorithms/tokenize";
import {
  computeInverseDocumentFrequencies,
  computeTfidfVector,
} from "@/lib/algorithms/tfidf";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const filter: Record<string, unknown> = {};
  if (tag) {
    filter.tags = tag.trim().toLowerCase();
  }
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { abstract: { $regex: q, $options: "i" } },
    ];
  }

  const resources = await ResourceModel.find(filter, "-tfidfVector")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ resources });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = formData.get("title");
  const abstract = formData.get("abstract");
  const tags = formData.getAll("tags").map((tag) => String(tag));
  const file = formData.get("file");

  if (
    typeof title !== "string" ||
    typeof abstract !== "string" ||
    !(file instanceof File)
  ) {
    return NextResponse.json(
      { error: "title, abstract, tags, and file are required." },
      { status: 400 }
    );
  }

  const wordCount = abstract.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 40) {
    return NextResponse.json(
      { error: "Abstract must be at least 40 words." },
      { status: 400 }
    );
  }
  if (tags.length < 3) {
    return NextResponse.json(
      { error: "At least 3 tags are required." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
  const uploadResult = await uploadResourceFile(dataUri);

  const newTokens = tokenize(`${title} ${abstract}`);
  const existingResources = await ResourceModel.find({}, "title abstract").lean();
  const documents = [
    ...existingResources.map((resource) =>
      tokenize(`${resource.title} ${resource.abstract}`)
    ),
    newTokens,
  ];
  const idf = computeInverseDocumentFrequencies(documents);
  const tfidfVector = computeTfidfVector(newTokens, idf);

  const resource = await ResourceModel.create({
    title,
    abstract,
    tags,
    fileUrl: uploadResult.secure_url,
    cloudinaryId: uploadResult.public_id,
    uploadedBy: session.user.id,
    tfidfVector,
  });

  return NextResponse.json({ resource }, { status: 201 });
}
