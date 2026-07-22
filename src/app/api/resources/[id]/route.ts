import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { deleteResourceFile } from "@/lib/cloudinary";
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
  const body = await request.json();
  const { title, abstract, tags } = body as {
    title?: string;
    abstract?: string;
    tags?: string[];
  };

  await connectToDatabase();

  const resource = await ResourceModel.findById(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  if (title !== undefined) resource.title = title;
  if (abstract !== undefined) resource.abstract = abstract;
  if (tags !== undefined) resource.tags = tags;

  if (title !== undefined || abstract !== undefined) {
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
  }

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
