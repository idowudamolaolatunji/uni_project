"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiUploadCloud,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiDownload,
  FiPlus,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TagPicker } from "@/components/tag-picker";
import { FilePicker, ACCEPTED_RESOURCE_EXTENSIONS } from "@/components/file-picker";
import { AdminShell } from "@/components/admin-shell";
import { parseCsvRecords } from "@/lib/csv";

const MIN_TAGS = 3;
const MIN_ABSTRACT_WORDS = 40;
const MAX_VOCABULARY_FETCH = 500;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeTagsCell(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(";")) {
    const normalized = part.trim().toLowerCase();
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}

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

async function fetchAllTags(): Promise<string[]> {
  const response = await fetch(`/api/tags?limit=${MAX_VOCABULARY_FETCH}`);
  if (!response.ok) {
    throw new Error("Failed to load tags.");
  }
  const data = await response.json();
  return data.tags as string[];
}

async function recomputeVectors() {
  const response = await fetch("/api/resources/recompute", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to recompute vectors.");
  }
  return response.json();
}

const CSV_TEMPLATE_HEADER = "title,abstract,tags";
const CSV_TEMPLATE_EXAMPLE_ABSTRACT =
  "A comprehensive introduction to arrays, linked lists, stacks, queues, trees, and graphs, covering time and space complexity trade-offs for common operations across a wide range of everyday academic use cases, worked examples, and practical exercises designed to build a solid foundation for further study in this area.";

function downloadCsvTemplate() {
  const exampleRow = `"Introduction to Data Structures","${CSV_TEMPLATE_EXAMPLE_ABSTRACT}","data structures; algorithms; software engineering"`;
  const csvContent = `${CSV_TEMPLATE_HEADER}\n${exampleRow}\n`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bulk-upload-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface BulkRow {
  key: string;
  title: string;
  abstract: string;
  tags: string[];
  file: File | null;
}

interface ValidatedBulkRow extends BulkRow {
  status: "pass" | "fail";
  reasons: string[];
}

type SubmitState = { status: "uploading" | "done" | "error"; error?: string };

function validateBulkRow(
  row: BulkRow,
  vocabulary: Set<string>,
  vocabularyReady: boolean
): { status: "pass" | "fail"; reasons: string[] } {
  const reasons: string[] = [];

  if (!row.title.trim()) {
    reasons.push("Missing title.");
  }

  if (!row.abstract.trim()) {
    reasons.push("Missing abstract.");
  } else {
    const wordCount = countWords(row.abstract);
    if (wordCount < MIN_ABSTRACT_WORDS) {
      reasons.push(
        `Abstract has only ${wordCount} word${wordCount === 1 ? "" : "s"} (minimum ${MIN_ABSTRACT_WORDS}).`
      );
    }
  }

  if (row.tags.length < MIN_TAGS) {
    reasons.push(
      `Only ${row.tags.length} tag${row.tags.length === 1 ? "" : "s"} provided (minimum ${MIN_TAGS}).`
    );
  }

  if (vocabularyReady) {
    const unknownTags = row.tags.filter((tag) => !vocabulary.has(tag));
    if (unknownTags.length > 0) {
      reasons.push(
        `Unknown tag${unknownTags.length === 1 ? "" : "s"} not yet in the shared vocabulary: ${unknownTags.join(", ")}.`
      );
    }
  }

  if (!row.file) {
    reasons.push("No file attached yet.");
  }

  return { status: reasons.length === 0 ? "pass" : "fail", reasons };
}

function buildRowsFromRecords(records: Record<string, string>[]): BulkRow[] {
  return records.map((record) => ({
    key: crypto.randomUUID(),
    title: record.title ?? "",
    abstract: record.abstract ?? "",
    tags: normalizeTagsCell(record.tags ?? ""),
    file: null,
  }));
}

function BulkRowItem({
  row,
  expanded,
  onToggleExpand,
  onUpdate,
  onToggleTag,
  onRemove,
  submitState,
  vocabularySet,
}: {
  row: ValidatedBulkRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<BulkRow>) => void;
  onToggleTag: (tag: string) => void;
  onRemove: () => void;
  submitState?: SubmitState;
  vocabularySet: Set<string>;
}) {
  const abstractWordCount = countWords(row.abstract);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orphanTags = row.tags.filter((tag) => !vocabularySet.has(tag));

  return (
    <>
      <TableRow>
        <TableCell>
          {!submitState && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleExpand}
              aria-label={expanded ? "Collapse" : "Edit row"}
            >
              {expanded ? (
                <FiChevronUp className="size-4" />
              ) : (
                <FiChevronDown className="size-4" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell>
          {submitState?.status === "uploading" && (
            <Badge variant="outline">Uploading...</Badge>
          )}
          {submitState?.status === "done" && (
            <Badge className="gap-1">
              <FiCheckCircle className="size-3" />
              Uploaded
            </Badge>
          )}
          {submitState?.status === "error" && (
            <Badge variant="destructive" className="gap-1">
              <FiXCircle className="size-3" />
              Failed
            </Badge>
          )}
          {!submitState && (
            <Badge variant="outline" className="text-muted-foreground">
              Draft
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="max-w-48 truncate font-medium">{row.title || "—"}</div>
        </TableCell>
        <TableCell>
          <div className="flex max-w-56 flex-wrap gap-1">
            {row.tags.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {row.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-primary/10 text-xs text-primary"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          {row.file ? (
            <div className="max-w-40 truncate text-xs">{row.file.name}</div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!submitState}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUploadCloud className="size-3.5" />
                Attach file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_RESOURCE_EXTENSIONS}
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  if (selected) onUpdate({ file: selected });
                  event.target.value = "";
                }}
              />
            </>
          )}
        </TableCell>
        <TableCell className="whitespace-normal">
          <div className="max-w-72 text-xs text-muted-foreground">
            {submitState?.status === "error"
              ? submitState.error
              : row.reasons.length > 0
                ? row.reasons.join(" ")
                : "Looks good."}
          </div>
        </TableCell>
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={submitState?.status === "uploading"}
            onClick={onRemove}
            aria-label="Remove row"
            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          >
            <FiTrash2 className="size-4" />
          </Button>
        </TableCell>
      </TableRow>

      {expanded && !submitState && (
        <TableRow>
          <TableCell colSpan={7} className="whitespace-normal bg-muted/30">
            <div className="space-y-4 p-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={row.title}
                  onChange={(event) => onUpdate({ title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Abstract</Label>
                <Textarea
                  value={row.abstract}
                  onChange={(event) => onUpdate({ abstract: event.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {abstractWordCount} / {MIN_ABSTRACT_WORDS} words minimum
                </p>
              </div>
              {orphanTags.length > 0 && (
                <div className="space-y-1.5 rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    Not yet in the shared vocabulary — remove{" "}
                    {orphanTags.length === 1 ? "it" : "them"}, or use &ldquo;Add
                    tag&rdquo; below with the exact same name to register{" "}
                    {orphanTags.length === 1 ? "it" : "them"}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {orphanTags.map((tag) => (
                      <Badge key={tag} variant="destructive" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => onToggleTag(tag)}
                          className="rounded-sm hover:opacity-80"
                        >
                          <FiXCircle className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <TagPicker
                selected={row.tags}
                onToggle={onToggleTag}
                label={`Tags (select at least ${MIN_TAGS})`}
                canManage
              />
              <FilePicker
                file={row.file}
                onChange={(nextFile) => onUpdate({ file: nextFile })}
                label="File"
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AdminUploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---- single upload state ----
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

  const abstractWordCount = countWords(abstractText);

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

  const singleUploadForm = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Introduction to Data Structures"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="abstract">Abstract</Label>
        <Textarea
          id="abstract"
          placeholder="Summarize what this resource covers, its key topics, and who it's useful for (minimum 40 words)..."
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
        canManage
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
  );

  // ---- bulk upload state ----
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [submitResults, setSubmitResults] = useState<Record<string, SubmitState>>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  const {
    data: vocabularyTags,
    isLoading: isVocabularyLoading,
    isError: isVocabularyError,
  } = useQuery({
    queryKey: ["tags", MAX_VOCABULARY_FETCH],
    queryFn: fetchAllTags,
  });
  const vocabularySet = useMemo(() => new Set(vocabularyTags ?? []), [vocabularyTags]);
  const vocabularyReady = vocabularyTags !== undefined;

  const handleCsvChange = (nextFile: File | null) => {
    setCsvError(null);

    if (!nextFile) {
      setCsvFile(null);
      return;
    }

    nextFile
      .text()
      .then((text) => {
        const records = parseCsvRecords(text);
        if (records.length === 0) {
          setCsvError("No rows found in this CSV.");
          setCsvFile(null);
          return;
        }
        setRows((current) => [...current, ...buildRowsFromRecords(records)]);
        setBulkSummary(null);
        setBulkError(null);
        setCsvFile(null);
      })
      .catch(() => {
        setCsvError("Couldn't read that CSV file.");
        setCsvFile(null);
      });
  };

  const addManualRow = () => {
    const key = crypto.randomUUID();
    setRows((current) => [
      ...current,
      { key, title: "", abstract: "", tags: [], file: null },
    ]);
    setExpandedRows((current) => new Set(current).add(key));
    setBulkSummary(null);
    setBulkError(null);
  };

  const validatedRows: ValidatedBulkRow[] = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        ...validateBulkRow(row, vocabularySet, vocabularyReady),
      })),
    [rows, vocabularySet, vocabularyReady]
  );

  const passCount = validatedRows.filter((row) => row.status === "pass").length;

  const updateRow = (key: string, patch: Partial<BulkRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const toggleRowTag = (key: string, tag: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const has = row.tags.includes(tag);
        return { ...row, tags: has ? row.tags.filter((t) => t !== tag) : [...row.tags, tag] };
      })
    );
  };

  const toggleExpand = (key: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
    setExpandedRows((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const passing = validatedRows.filter((row) => row.status === "pass");
      const succeededKeys: string[] = [];

      for (const row of passing) {
        setSubmitResults((current) => ({ ...current, [row.key]: { status: "uploading" } }));

        try {
          const formData = new FormData();
          formData.set("title", row.title);
          formData.set("abstract", row.abstract);
          row.tags.forEach((tag) => formData.append("tags", tag));
          formData.set("file", row.file as File);

          await createResource(formData);

          succeededKeys.push(row.key);
          setSubmitResults((current) => ({ ...current, [row.key]: { status: "done" } }));
        } catch (err) {
          setSubmitResults((current) => ({
            ...current,
            [row.key]: { status: "error", error: (err as Error).message },
          }));
        }
      }

      if (succeededKeys.length > 0) {
        await recomputeVectors();
      }

      return succeededKeys;
    },
    onSuccess: (succeededKeys) => {
      const failedCount = passCount - succeededKeys.length;
      setRows((current) => current.filter((row) => !succeededKeys.includes(row.key)));
      queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      setBulkSummary(
        `${succeededKeys.length} resource${succeededKeys.length === 1 ? "" : "s"} uploaded.` +
          (failedCount > 0 ? ` ${failedCount} failed — see details below.` : "")
      );
    },
    onError: (mutationError: Error) => {
      setBulkError(mutationError.message);
    },
  });

  const bulkUploadCard = (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FiFileText className="size-4.5" />
          </div>
          <div>
            <CardTitle>Bulk upload resources</CardTitle>
            <CardDescription>
              Import rows from a CSV, add rows manually, or both — then attach each
              resource&apos;s file directly in the table below.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        {isVocabularyError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <FiAlertCircle className="size-4 shrink-0" />
            Couldn&apos;t load the shared tag vocabulary, so tag checks are paused.
            Refresh the page and try again.
          </p>
        )}
        {isVocabularyLoading && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FiAlertCircle className="size-4 shrink-0" />
            Loading the shared tag vocabulary before rows can be validated...
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiFileText className="size-4 text-primary" />
                <p className="text-sm font-medium">Option A &mdash; Import from CSV</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={downloadCsvTemplate}>
                <FiDownload className="size-3.5" />
                Template
              </Button>
            </div>
            <FilePicker
              file={csvFile}
              onChange={handleCsvChange}
              label="CSV file"
              accept=".csv"
              hint="Columns: title, abstract, tags — separated by semicolons (;)"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center gap-2">
              <FiEdit2 className="size-4 text-primary" />
              <p className="text-sm font-medium">Option B &mdash; Add manually</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Type in each resource&apos;s title, abstract, tags, and file directly in
              the table below.
            </p>
            <Button type="button" onClick={addManualRow}>
              <FiPlus className="size-4" />
              Add a row
            </Button>
          </div>
        </div>

        {csvError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <FiAlertCircle className="size-4 shrink-0" />
            {csvError}
          </p>
        )}

        {validatedRows.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {passCount} of {validatedRows.length} row{validatedRows.length === 1 ? "" : "s"}{" "}
              ready to upload
            </p>

            <div className="min-w-0 overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedRows.map((row) => (
                    <BulkRowItem
                      key={row.key}
                      row={row}
                      expanded={expandedRows.has(row.key)}
                      onToggleExpand={() => toggleExpand(row.key)}
                      onUpdate={(patch) => updateRow(row.key, patch)}
                      onToggleTag={(tag) => toggleRowTag(row.key, tag)}
                      onRemove={() => removeRow(row.key)}
                      submitState={submitResults[row.key]}
                      vocabularySet={vocabularySet}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {bulkError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <FiAlertCircle className="size-4 shrink-0" />
                {bulkError}
              </p>
            )}
            {bulkSummary && (
              <p className="flex items-center gap-1.5 text-sm text-primary">
                <FiCheckCircle className="size-4 shrink-0" />
                {bulkSummary}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={passCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate()}
            >
              {bulkMutation.isPending
                ? "Uploading..."
                : `Upload ${passCount} valid resource${passCount === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminShell>
      <main className="mx-auto flex w-full max-w-4xl flex-col p-8">
        <Tabs defaultValue="single">
          <TabsList className="mx-auto max-w-2xl">
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card className="mx-auto w-full max-w-2xl shadow-sm">
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
              <CardContent>{singleUploadForm}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">{bulkUploadCard}</TabsContent>
        </Tabs>
      </main>
    </AdminShell>
  );
}
