"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiEdit2, FiAlertCircle, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TagPicker } from "@/components/tag-picker";
import { FilePicker } from "@/components/file-picker";
import { AdminShell } from "@/components/admin-shell";

const MIN_TAGS = 3;
const MIN_ABSTRACT_WORDS = 40;

interface Resource {
  _id: string;
  title: string;
  abstract: string;
  tags: string[];
  fileUrl: string;
}

async function fetchResource(id: string) {
  const response = await fetch(`/api/resources/${id}`);
  if (!response.ok) {
    throw new Error("Failed to load resource.");
  }
  return response.json() as Promise<{ resource: Resource }>;
}

async function updateResource(id: string, formData: FormData) {
  const response = await fetch(`/api/resources/${id}`, {
    method: "PATCH",
    body: formData,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update resource.");
  }
  return response.json();
}

async function deleteResource(id: string) {
  const response = await fetch(`/api/resources/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete resource.");
  }
  return response.json();
}

function EditResourceForm({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["resource", id],
    queryFn: () => fetchResource(id),
  });

  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setTitle(data.resource.title);
      setAbstractText(data.resource.abstract);
      setSelectedTags(data.resource.tags);
      setInitialized(true);
    }
  }, [data, initialized]);

  const updateMutation = useMutation({
    mutationFn: (formData: FormData) => updateResource(id, formData),
    onSuccess: () => {
      router.push("/admin");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteResource(id),
    onSuccess: () => {
      router.push("/admin");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
      setConfirmDeleteOpen(false);
    },
  });

  const abstractWordCount = abstractText.trim().split(/\s+/).filter(Boolean).length;

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (abstractWordCount < MIN_ABSTRACT_WORDS) {
      setError(`Abstract must be at least ${MIN_ABSTRACT_WORDS} words.`);
      return;
    }
    if (selectedTags.length < MIN_TAGS) {
      setError(`Select at least ${MIN_TAGS} tags.`);
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("abstract", abstractText);
    selectedTags.forEach((tag) => formData.append("tags", tag));
    if (file) formData.set("file", file);

    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load this resource.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="abstract">Abstract</Label>
          <Textarea
            id="abstract"
            value={abstractText}
            onChange={(event) => setAbstractText(event.target.value)}
            rows={6}
            required
          />
          <p className="text-xs text-muted-foreground">
            {abstractWordCount} / {MIN_ABSTRACT_WORDS} words minimum
          </p>
        </div>

        <TagPicker
          selected={selectedTags}
          onToggle={toggleTag}
          label={`Tags (select at least ${MIN_TAGS})`}
        />

        <FilePicker
          file={file}
          onChange={setFile}
          label="Replace file (optional)"
          existingFileUrl={data.resource.fileUrl}
        />

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <FiAlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <FiTrash2 className="size-4" />
            Delete
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{data.resource.title}&rdquo; and its
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
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function EditResourcePage() {
  const params = useParams<{ id: string }>();

  return (
    <AdminShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FiEdit2 className="size-4.5" />
              </div>
              <div>
                <CardTitle>Edit resource</CardTitle>
                <CardDescription>
                  Update metadata or remove this resource.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EditResourceForm id={params.id} />
          </CardContent>
        </Card>
      </main>
    </AdminShell>
  );
}
