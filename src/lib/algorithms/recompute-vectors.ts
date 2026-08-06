import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { tokenize } from "@/lib/algorithms/tokenize";
import {
  computeInverseDocumentFrequencies,
  computeTfidfVector,
} from "@/lib/algorithms/tfidf";

/**
 * Recomputes tfidfVector for every resource using one shared IDF built
 * across the current full corpus. Per-resource uploads compute an
 * isolated vector at upload time; this brings the whole corpus back
 * into a mutually consistent vector space after it shifts materially
 * (e.g. a bulk import), per docs/product_spec.md section 7.
 */
export async function recomputeAllTfidfVectors(): Promise<number> {
  await connectToDatabase();

  const resources = await ResourceModel.find({}, "title abstract").lean();
  const tokenized = resources.map((resource) =>
    tokenize(`${resource.title} ${resource.abstract}`)
  );
  const idf = computeInverseDocumentFrequencies(tokenized);

  await Promise.all(
    resources.map((resource, index) =>
      ResourceModel.updateOne(
        { _id: resource._id },
        { $set: { tfidfVector: computeTfidfVector(tokenized[index], idf) } }
      )
    )
  );

  return resources.length;
}
