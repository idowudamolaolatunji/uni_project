"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["resources", q, tag],
    queryFn: () => fetchResources({ q, tag }),
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Search resources</h1>
        <p className="text-muted-foreground">
          Filter the catalog by keyword or tag.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q">Keyword</Label>
          <Input id="q" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag">Tag</Label>
          <Input id="tag" value={tag} onChange={(event) => setTag(event.target.value)} />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn&apos;t load resources.</p>
      )}
      {data && data.resources.length === 0 && (
        <p className="text-muted-foreground">No matching resources.</p>
      )}

      <div className="flex flex-col gap-4">
        {data?.resources.map((resource) => (
          <Card key={resource._id}>
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
