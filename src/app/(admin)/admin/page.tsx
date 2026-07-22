"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminShell } from "@/components/admin-shell";

interface Resource {
  _id: string;
  title: string;
  abstract: string;
  courseCode: string;
  tags: string[];
}

async function fetchResources() {
  const response = await fetch("/api/resources");
  if (!response.ok) {
    throw new Error("Failed to load resources.");
  }
  return response.json() as Promise<{ resources: Resource[] }>;
}

async function deleteResource(id: string) {
  const response = await fetch(`/api/resources/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete resource.");
  }
  return response.json();
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: fetchResources,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resource catalog</h1>
          <p className="text-muted-foreground">
            Manage the resources students can be recommended.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/upload">Upload resource</Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn&apos;t load resources.</p>
      )}
      {data && data.resources.length === 0 && (
        <p className="text-muted-foreground">No resources uploaded yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {data?.resources.map((resource) => (
          <Card key={resource._id}>
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
              <CardDescription>{resource.courseCode.toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {resource.abstract}
              </p>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/resources/${resource._id}/edit`}>Edit</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(resource._id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminShell>
      <AdminDashboard />
    </AdminShell>
  );
}
