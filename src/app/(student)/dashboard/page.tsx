"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface RecommendedResource {
  resource: {
    id: string;
    title: string;
    abstract: string;
    courseCode: string;
    tags: string[];
    fileUrl: string;
  };
  jaccard: number;
  cosine: number;
  finalScore: number;
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

export default function DashboardPage() {
  const [alpha, setAlpha] = useState(0.5);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recommendations", alpha],
    queryFn: () => fetchRecommendations(alpha),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Your recommendations</h1>
        <p className="text-muted-foreground">
          Ranked using a hybrid of tag overlap (Jaccard) and content
          similarity (Cosine).
        </p>
      </div>

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
        <p className="text-muted-foreground">Loading recommendations...</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load recommendations. Try again later.
        </p>
      )}
      {data && data.recommendations.length === 0 && (
        <p className="text-muted-foreground">
          No resources are available yet.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {data?.recommendations.map(({ resource, jaccard, cosine, finalScore }) => (
          <Card key={resource.id}>
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
              <CardDescription>{resource.courseCode.toUpperCase()}</CardDescription>
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
