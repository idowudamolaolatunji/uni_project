"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FiUploadCloud, FiAlertCircle } from "react-icons/fi";
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
import { TagPicker } from "@/components/tag-picker";
import { FilePicker } from "@/components/file-picker";
import { AdminShell } from "@/components/admin-shell";

const MIN_TAGS = 3;
const MIN_ABSTRACT_WORDS = 40;

async function createResource(formData: FormData) {
  const response = await fetch("/api/resources", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to upload resource.");
  }

  return response.json();
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      router.push("/admin");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
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
    if (!file) {
      setError("A file is required.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("abstract", abstractText);
    selectedTags.forEach((tag) => formData.append("tags", tag));
    formData.set("file", file);

    mutation.mutate(formData);
  };

  return (
    <AdminShell>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FiUploadCloud className="size-4.5" />
              </div>
              <div>
                <CardTitle>Upload a resource</CardTitle>
                <CardDescription>
                  Add a new academic resource to the catalog.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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

              <FilePicker file={file} onChange={setFile} label="File" />

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <FiAlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? "Uploading..." : "Upload resource"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </AdminShell>
  );
}
