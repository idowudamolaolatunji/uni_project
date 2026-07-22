"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TAG_VOCABULARY } from "@/lib/constants";
import { RequireAuth } from "@/components/require-auth";

const MIN_TAGS = 3;

async function saveProfile(payload: {
  interests: string[];
  tags: string[];
  courseCodes: string[];
}) {
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

function Onboarding() {
  const router = useRouter();
  const [courseCodes, setCourseCodes] = useState<string[]>([]);
  const [courseCodeInput, setCourseCodeInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const addCourseCode = () => {
    const value = courseCodeInput.trim().toLowerCase();
    if (value && !courseCodes.includes(value)) {
      setCourseCodes((current) => [...current, value]);
    }
    setCourseCodeInput("");
  };

  const removeCourseCode = (code: string) => {
    setCourseCodes((current) => current.filter((c) => c !== code));
  };

  const handleCourseCodeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCourseCode();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (courseCodes.length < 1) {
      setError("Add at least one course code.");
      return;
    }
    if (selectedTags.length < MIN_TAGS) {
      setError(`Select at least ${MIN_TAGS} topics.`);
      return;
    }

    mutation.mutate({
      interests: selectedTags,
      tags: selectedTags,
      courseCodes,
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
      <Card>
        <CardHeader>
          <CardTitle>Tell us about yourself</CardTitle>
          <CardDescription>
            This helps us personalize your recommendations from the start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course codes</Label>
              <div className="flex gap-2">
                <Input
                  id="courseCode"
                  value={courseCodeInput}
                  onChange={(event) => setCourseCodeInput(event.target.value)}
                  onKeyDown={handleCourseCodeKeyDown}
                  placeholder="e.g. cs101"
                />
                <Button type="button" variant="outline" onClick={addCourseCode}>
                  Add
                </Button>
              </div>
              {courseCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {courseCodes.map((code) => (
                    <span
                      key={code}
                      className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                    >
                      {code.toUpperCase()}
                      <button
                        type="button"
                        onClick={() => removeCourseCode(code)}
                        aria-label={`Remove ${code}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <FiX className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add a course code.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Topics you&apos;re interested in (select at least {MIN_TAGS})</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TAG_VOCABULARY.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Saving..." : "Continue to dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  );
}
