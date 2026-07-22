"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiGrid, FiUpload, FiEdit2, FiTrash2, FiInbox, FiAlertCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminShell } from "@/components/admin-shell";

interface Resource {
  _id: string;
  title: string;
  abstract: string;
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

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: fetchResources,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      setPendingDelete(null);
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiGrid className="size-4.5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Resource catalog</h1>
            <p className="text-sm text-muted-foreground">
              Manage the resources students can be recommended.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/upload">
            <FiUpload className="size-4" />
            Upload
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <ResourceCardSkeleton />
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
            <p>No resources uploaded yet.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/admin/upload">Upload your first resource</Link>
            </Button>
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
                  <Link href={`/admin/resources/${resource._id}/edit`}>
                    <FiEdit2 className="size-3.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPendingDelete(resource)}
                >
                  <FiTrash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{pendingDelete?.title}&rdquo; and its
              uploaded file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete._id);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
