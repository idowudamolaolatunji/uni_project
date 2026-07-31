"use client";

import { useState, type KeyboardEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { FiPlus, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const MAX_TAGS = 500;
const PAGE_SIZE = 100;

async function fetchTags(limit: number): Promise<{ tags: string[]; total: number }> {
  const response = await fetch(`/api/tags?limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to load tags.");
  }
  return response.json();
}

async function createTag(name: string): Promise<string> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to add tag.");
  }
  const data = await response.json();
  return data.tag as string;
}

async function deleteTag(name: string): Promise<void> {
  const response = await fetch(`/api/tags/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete tag.");
  }
}

export function TagPicker({
  selected,
  onToggle,
  label,
  canManage = false,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  label: string;
  canManage?: boolean;
}) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [tagPendingDelete, setTagPendingDelete] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["tags", limit],
    queryFn: () => fetchTags(limit),
    placeholderData: keepPreviousData,
  });
  const tags = data?.tags ?? [];
  const total = data?.total ?? 0;
  const hasMore = tags.length < total;

  const addMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onToggle(tag);
      setNewTag("");
      setIsAdding(false);
      setError(null);
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: (_data, tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      if (selected.includes(tag)) onToggle(tag);
      setTagPendingDelete(null);
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
      setTagPendingDelete(null);
    },
  });

  const handleAdd = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) {
      return;
    }
    addMutation.mutate(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {canManage && tags.length < MAX_TAGS && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding((current) => !current)}
          >
            <FiPlus className="size-4" />
            Add tag
          </Button>
        )}
      </div>

      {canManage && isAdding && (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New tag name"
            autoFocus
          />
          <Button type="button" onClick={handleAdd} disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <div
              key={tag}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                isSelected
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border hover:bg-accent/50"
              )}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 overflow-hidden">
                <Checkbox checked={isSelected} onCheckedChange={() => onToggle(tag)} />
                <span className="truncate">{tag}</span>
              </label>
              {canManage && (
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => setTagPendingDelete(tag)}
                  className="shrink-0 rounded-sm p-0.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <FiX className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {tags.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {tags.length} of {total} tags
          </p>
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
            >
              Load more tags
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={tagPendingDelete !== null}
        onOpenChange={(open) => !open && setTagPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &ldquo;{tagPendingDelete}&rdquo; from the shared tag
              vocabulary entirely. It won&apos;t be selectable anywhere anymore.
              This action cannot be undone.
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
                if (tagPendingDelete) deleteMutation.mutate(tagPendingDelete);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
