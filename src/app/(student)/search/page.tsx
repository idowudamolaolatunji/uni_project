"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiSearch, FiAlertCircle, FiInbox, FiExternalLink } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Resource {
  _id: string;
  title: string;
  abstract: string;
  tags: string[];
  fileUrl: string;
}

async function fetchResources(params: { q: string; tag: string }) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.tag) searchParams.set("tag", params.tag);

  const response = await fetch(`/api/resources?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load resources.");
  }
  return response.json() as Promise<{ resources: Resource[] }>;
}

function ResourceCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["resources", q, tag],
    queryFn: () => fetchResources({ q, tag }),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FiSearch className="size-4.5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Search resources</h1>
          <p className="text-sm text-muted-foreground">
            Filter the catalog by keyword or tag.
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q">Keyword</Label>
          <Input id="q" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag">Tag</Label>
          <Input id="tag" value={tag} onChange={(event) => setTag(event.target.value)} />
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
        </div>
      )}
      {isError && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <FiAlertCircle className="size-4 shrink-0" />
          Couldn&apos;t load resources.
        </p>
      )}
      {data && data.resources.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <FiInbox className="size-8" />
            <p>No matching resources.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {data?.resources.map((resource) => (
          <Card key={resource._id} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {resource.abstract}
              </p>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
              >
                View resource
                <FiExternalLink className="size-3.5" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
