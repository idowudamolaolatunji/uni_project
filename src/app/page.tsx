import Link from "next/link";
import { FiBookOpen, FiTarget, FiSliders, FiUploadCloud } from "react-icons/fi";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FiTarget,
    title: "Hybrid ranking",
    description:
      "Recommendations blend tag overlap (Jaccard) with content similarity (Cosine) into one score.",
  },
  {
    icon: FiSliders,
    title: "Tunable weighting",
    description:
      "A single slider controls how much weight tag overlap gets versus content similarity.",
  },
  {
    icon: FiUploadCloud,
    title: "Curated catalog",
    description:
      "Every resource is reviewed and tagged by an admin — no scraping, no noisy metadata.",
  },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-128 w-lg -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-8 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FiBookOpen className="size-7" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Academic Resource Recommender
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Personalized academic resource recommendations powered by a
            hybrid Jaccard + Cosine similarity engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/register">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center shadow-sm"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/admin/login"
        className="relative pb-8 text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
      >
        Admin login
      </Link>
    </main>
  );
}
