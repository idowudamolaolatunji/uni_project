import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { deleteResourceFile, uploadResourceFile } from "@/lib/cloudinary";
import { tokenize } from "@/lib/algorithms/tokenize";
import {
  computeInverseDocumentFrequencies,
  computeTfidfVector,
} from "@/lib/algorithms/tfidf";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();

  const resource = await ResourceModel.findById(id, "-tfidfVector").lean();
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  return NextResponse.json({ resource });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const title = formData.get("title");
  const abstract = formData.get("abstract");
  const tags = formData.getAll("tags").map((tag) => String(tag));
  const file = formData.get("file");

  if (typeof title !== "string" || typeof abstract !== "string") {
    return NextResponse.json(
      { error: "title and abstract are required." },
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

  const resource = await ResourceModel.findById(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  resource.title = title;
  resource.abstract = abstract;
  resource.tags = tags;

  if (file instanceof File && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const previousCloudinaryId = resource.cloudinaryId;

    const uploadResult = await uploadResourceFile(dataUri);
    resource.fileUrl = uploadResult.secure_url;
    resource.cloudinaryId = uploadResult.public_id;

    await deleteResourceFile(previousCloudinaryId);
  }

  const updatedTokens = tokenize(`${resource.title} ${resource.abstract}`);
  const otherResources = await ResourceModel.find(
    { _id: { $ne: id } },
    "title abstract"
  ).lean();
  const documents = [
    ...otherResources.map((other) => tokenize(`${other.title} ${other.abstract}`)),
    updatedTokens,
  ];
  const idf = computeInverseDocumentFrequencies(documents);
  resource.tfidfVector = computeTfidfVector(updatedTokens, idf);

  await resource.save();

  return NextResponse.json({ resource });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  await connectToDatabase();

  const resource = await ResourceModel.findById(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  await deleteResourceFile(resource.cloudinaryId);
  await resource.deleteOne();

  return NextResponse.json({ success: true });
}
