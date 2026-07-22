"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface RecommendedResource {
  resource: {
    id: string;
    title: string;
    abstract: string;
    tags: string[];
    fileUrl: string;
  };
  jaccard: number;
  cosine: number;
  finalScore: number;
}

interface Profile {
  interests: string[];
  tags: string[];
}

async function fetchRecommendations(alpha: number) {
  const response = await fetch(`/api/recommendations?alpha=${alpha}`);
  if (!response.ok) {
    throw new Error("Failed to load recommendations.");
  }
  return response.json() as Promise<{
    alpha: number;
    recommendations: RecommendedResource[];
  }>;
}

async function fetchProfile() {
  const response = await fetch("/api/users/me");
  if (!response.ok) {
    throw new Error("Failed to load profile.");
  }
  const data = (await response.json()) as { user: Profile };
  return data.user;
}

function RecommendationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [alpha, setAlpha] = useState(0.5);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recommendations", alpha],
    queryFn: () => fetchRecommendations(alpha),
  });

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: fetchProfile,
  });

  const needsOnboarding =
    profile !== undefined &&
    profile.tags.length === 0 &&
    profile.interests.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{session?.user.email ? `, ${session.user.email}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Ranked using a hybrid of tag overlap (Jaccard) and content
          similarity (Cosine).
        </p>
      </div>

      {needsOnboarding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <p className="text-sm">
              You haven&apos;t set your interests or tags yet &mdash;
              recommendations will be more relevant once you do.
            </p>
            <Button asChild size="sm">
              <Link href="/onboarding">Complete onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Tag overlap</span>
          <span>Content similarity</span>
        </div>
        <Slider
          value={[alpha]}
          onValueChange={([value]) => setAlpha(value)}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-center text-sm text-muted-foreground">
          α = {alpha.toFixed(2)}
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <RecommendationSkeleton />
          <RecommendationSkeleton />
          <RecommendationSkeleton />
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load recommendations. Try again later.
        </p>
      )}
      {data && data.recommendations.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No resources are available yet. Check back once an admin has
            uploaded some.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {data?.recommendations.map(({ resource, jaccard, cosine, finalScore }) => (
          <Card key={resource.id}>
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {resource.abstract}
              </p>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Jaccard: {jaccard.toFixed(2)}</span>
                <span>Cosine: {cosine.toFixed(2)}</span>
                <span>Score: {finalScore.toFixed(2)}</span>
              </div>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline"
              >
                View resource
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

