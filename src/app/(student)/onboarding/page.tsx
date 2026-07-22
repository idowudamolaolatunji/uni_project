"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FiUser, FiAlertCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TagPicker } from "@/components/tag-picker";

const MIN_TAGS = 3;

interface Profile {
  interests: string[];
  tags: string[];
}

async function fetchProfile() {
  const response = await fetch("/api/users/me");
  if (!response.ok) {
    throw new Error("Failed to load profile.");
  }
  const data = (await response.json()) as { user: Profile };
  return data.user;
}

async function saveProfile(payload: { interests: string[]; tags: string[] }) {
  const response = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save your profile.");
  }

  return response.json();
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: fetchProfile });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setSelectedTags(profile.tags.length > 0 ? profile.tags : profile.interests);
      setInitialized(true);
    }
  }, [profile, initialized]);

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (selectedTags.length < MIN_TAGS) {
      setError(`Select at least ${MIN_TAGS} topics.`);
      return;
    }

    mutation.mutate({
      interests: selectedTags,
      tags: selectedTags,
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FiUser className="size-4.5" />
            </div>
            <div>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>
                Update your interests and tags to improve your recommendations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <TagPicker
              selected={selectedTags}
              onToggle={toggleTag}
              label={`Topics you're interested in (select at least ${MIN_TAGS})`}
            />

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <FiAlertCircle className="size-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
