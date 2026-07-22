"use client";

import { useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const MAX_TAGS = 500;

async function fetchTags(): Promise<string[]> {
  const response = await fetch("/api/tags");
  if (!response.ok) {
    throw new Error("Failed to load tags.");
  }
  const data = await response.json();
  return data.tags as string[];
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

export function TagPicker({
  selected,
  onToggle,
  label,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  label: string;
}) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });

  const mutation = useMutation({
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

  const handleAdd = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) {
      return;
    }
    mutation.mutate(trimmed);
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
        {tags.length < MAX_TAGS && (
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

      {isAdding && (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New tag name"
            autoFocus
          />
          <Button type="button" onClick={handleAdd} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tags.map((tag) => (
          <label key={tag} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(tag)}
              onCheckedChange={() => onToggle(tag)}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>
  );
}
