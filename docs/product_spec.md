# Product Specification
## Personalized Academic Resource Recommendation System

**Date:** July 2026
**Target audience:** University students, academic researchers, university repository administrators

**Underlying thesis title:** Design and Implementation of a Personalized Academic Resource Recommendation System Using Jaccard and Cosine Similarity Algorithms

---

## 1. Product overview

A web-based platform that recommends academic resources to students using a hybrid content-based algorithm: Jaccard Similarity (set overlap on tags/course codes) combined with Cosine Similarity (TF-IDF vector comparison on titles/abstracts). Unlike the original PRD, this system does not scrape or ingest resources from external sources at runtime. We curates and manually uploads 100+ academic resources through an admin interface, with files stored on Cloudinary and metadata stored in MongoDB.

## 2. Problem statement

- **Static keyword inefficiency:** exact-string matching misses synonyms and related concepts.
- **Information overload:** unranked, unfiltered repository views force students to manually sift through results.
- **Algorithmic isolation:** systems typically use either structured tags or free-text context, not both together, leaving a gap between a student's declared curriculum and their actual research needs.

## 3. Proposed solution

A hybrid recommendation engine that runs two algorithms over the same resource set and blends the results:

- **Jaccard Similarity:** intersection-over-union of the user's declared interest/course tags against each resource's tags.
- **Cosine Similarity:** angular similarity between TF-IDF vectors built from resource titles/abstracts and the user's interest profile (treated as a pseudo-document).
- **Hybrid score:** a weighted sum of the two (`score = α · jaccard + (1 − α) · cosine`), with α adjustable so the effect of each algorithm is demonstrable and tunable for evaluation.

## 4. Scope of work

### In scope
- Secure authentication (student and admin roles)
- Admin dashboard: upload resources (file to Cloudinary, metadata to MongoDB), edit/delete resources, manage tags and course codes
- Student onboarding: interest/course/tag selection to address cold start
- Tokenization pipeline: normalization, tokenization, stop-word removal, TF-IDF vectorization
- Jaccard engine, Cosine engine, and a hybrid results aggregator
- Personalized dashboard feed showing ranked recommendations
- Basic search and filtering by tag/course code
- Manual evaluation workflow (sample queries reviewed for relevance, documented in the report)

### Out of scope (explicit exclusions)
- Web scraping or third-party API ingestion: replaced by manual/admin resource upload
- Peer-to-peer collaborative filtering (user-to-user rating matrices)
- Deep-learning/neural embedding models
- Real-time audio-visual content parsing
- Live multi-tenant LMS integrations
- Automated precision/recall/F1 dashboards (a manual evaluation write-up substitutes for this)

## 5. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) + React | Server components for the feed, client components for interactive filters |
| Styling / components | Tailwind CSS + shadcn/ui | Consistent, accessible component primitives without a heavy design system |
| Data fetching / caching | TanStack Query | Caches recommendation results and resource lists client-side; handles loading/error states |
| Auth | Auth.js (NextAuth) with Credentials provider + MongoDB adapter | Student and admin roles via a `role` field on the user document |
| Database | MongoDB Atlas | Stores users, resources, and precomputed TF-IDF vectors |
| ODM | Mongoose | Schema validation and query layer over MongoDB |
| File/media storage | Cloudinary | Stores uploaded resource files (PDFs, slides, etc.); MongoDB stores the returned Cloudinary URL + public ID, not the binary |
| Hosting | Vercel | Matches Next.js deployment model; environment variables for MongoDB URI and Cloudinary credentials |
| Algorithm runtime | TypeScript, in Next.js API routes / server actions | Tokenization, Jaccard, and Cosine implemented directly; no separate Python service |

## 6. Functional requirements

| Feature category | Requirement | Description |
|---|---|---|
| Authentication | Login / registration | Auth.js credentials-based login for students; separate admin role with elevated permissions |
| User profiling | Interest management | Onboarding flow where new students select interests, course codes, and skill tags (mitigates cold start) |
| Resource management | Admin upload | Admins upload resource files to Cloudinary and enter metadata (title, abstract, course code, tags) into MongoDB via an admin form |
| Resource management | Edit / delete | Admins can update metadata or remove a resource (and its Cloudinary asset) |
| Data preprocessing | Tokenization engine | Normalizes and tokenizes titles/abstracts; removes stop-words; feeds TF-IDF vectorization |
| Algorithm engine 1 | Jaccard processor | Computes intersection-over-union of user tags vs. resource tags |
| Algorithm engine 2 | Cosine processor | Converts text to TF-IDF vectors; computes cosine angle between user profile vector and resource vectors |
| Hybrid engine | Results aggregator | Combines Jaccard and Cosine scores (weighted) to produce a ranked list |
| Dashboard | Personalized feed | Displays ranked recommendations, cached via TanStack Query |
| Search | Tag/course filter | Lets students narrow the resource catalog manually alongside recommendations |

## 7. Data model (MongoDB / Mongoose)

```
User {
  _id
  email
  passwordHash
  role: "student" | "admin"
  interests: string[]
  courseCodes: string[]
  tags: string[]
  createdAt
}

Resource {
  _id
  title
  abstract
  courseCode
  tags: string[]
  fileUrl        // Cloudinary secure_url
  cloudinaryId    // Cloudinary public_id, needed for deletion
  uploadedBy      // ref -> User (admin)
  tfidfVector: { [term: string]: number }   // precomputed at upload time
  createdAt
}
```

`tfidfVector` is computed once, at upload time (or via a recompute script when the corpus changes materially), not on every request. This keeps the Cosine step cheap at query time even as the catalog grows.

## 8. Algorithm design detail

1. **Tokenization pipeline** (runs on resource `title + abstract`, and on the student's `interests + tags` as a pseudo-document): lowercase and strip punctuation, tokenize on whitespace/word boundaries, remove stop-words (a small hardcoded list is sufficient).
2. **Jaccard step:** `|userTags ∩ resourceTags| / |userTags ∪ resourceTags|`, computed directly on the tag/course-code sets.
3. **Cosine step:** build a shared vocabulary across all resources, compute TF-IDF weights, represent the student's interest profile as a vector in the same space, and compute cosine similarity against each resource vector.
4. **Hybrid aggregation:** `finalScore = α · jaccard + (1 − α) · cosine`. Expose α as a configurable weight (even just a slider in the UI). This doubles as a demo feature and a way to discuss algorithm sensitivity in the evaluation chapter.

## 9. Non-functional requirements

- **Performance:** recommendation queries should return in well under a second for a catalog in the low hundreds of resources, given precomputed vectors.
- **Caching:** TanStack Query caches resource lists and recommendation results client-side to avoid redundant requests during a session.
- **Security:** passwords hashed (handled by Auth.js), admin routes protected by role check on both the UI and the API route.
- **Evaluation:** log sample queries and their top-N results for manual relevance review; document findings qualitatively rather than building automated precision/recall tooling.