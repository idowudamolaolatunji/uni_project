import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { UserModel } from "@/lib/models/User";
import { tokenize } from "@/lib/algorithms/tokenize";
import { jaccardSimilarity } from "@/lib/algorithms/jaccard";
import { cosineSimilarity } from "@/lib/algorithms/cosine";
import { hybridScore } from "@/lib/algorithms/hybrid";
import {
  computeInverseDocumentFrequencies,
  computeTfidfVector,
} from "@/lib/algorithms/tfidf";

const DEFAULT_ALPHA = 0.5;

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const alphaParam = searchParams.get("alpha");
  const alpha = alphaParam !== null ? Number(alphaParam) : DEFAULT_ALPHA;

  if (Number.isNaN(alpha) || alpha < 0 || alpha > 1) {
    return NextResponse.json(
      { error: "alpha must be a number between 0 and 1." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const resources = await ResourceModel.find({});

  const documents = resources.map((resource) =>
    tokenize(`${resource.title} ${resource.abstract}`)
  );
  const idf = computeInverseDocumentFrequencies(documents);

  const userTagSet = [
    ...(user.interests ?? []),
    ...(user.tags ?? []),
    ...(user.courseCodes ?? []),
  ];
  const userTokens = tokenize(userTagSet.join(" "));
  const userVector = computeTfidfVector(userTokens, idf);

  const recommendations = resources
    .map((resource) => {
      const resourceTagSet = [...resource.tags, resource.courseCode];
      const jaccard = jaccardSimilarity(userTagSet, resourceTagSet);
      const cosine = cosineSimilarity(
        userVector,
        resource.tfidfVector ?? new Map()
      );
      const finalScore = hybridScore(jaccard, cosine, alpha);

      return {
        resource: {
          id: resource._id.toString(),
          title: resource.title,
          abstract: resource.abstract,
          courseCode: resource.courseCode,
          tags: resource.tags,
          fileUrl: resource.fileUrl,
        },
        jaccard,
        cosine,
        finalScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  return NextResponse.json({ alpha, recommendations });
}
