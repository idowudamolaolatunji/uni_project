"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { FilePicker } from "@/components/file-picker";
import { MultiFilePicker } from "@/components/multi-file-picker";
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

interface BulkRow {
  key: string;
  title: string;
  abstract: string;
  tags: string[];
  filename: string;
  file: File | null;
  fileManuallySet: boolean;
}

interface ValidatedBulkRow extends BulkRow {
  status: "pass" | "fail";
  reasons: string[];
}

type SubmitState = { status: "uploading" | "done" | "error"; error?: string };

function validateBulkRow(
  row: BulkRow,
  vocabulary: Set<string>
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

  const unknownTags = row.tags.filter((tag) => !vocabulary.has(tag));
  if (unknownTags.length > 0) {
    reasons.push(
      `Unknown tag${unknownTags.length === 1 ? "" : "s"} not yet in the shared vocabulary: ${unknownTags.join(", ")}.`
    );
  }

  if (!row.filename.trim()) {
    reasons.push("Missing filename.");
  } else if (!row.file) {
    reasons.push(`No selected file matches "${row.filename}".`);
  }

  return { status: reasons.length === 0 ? "pass" : "fail", reasons };
}

function buildRowsFromRecords(
  records: Record<string, string>[],
  batchFiles: File[]
): BulkRow[] {
  const filesByName = new Map(batchFiles.map((file) => [file.name, file]));
  return records.map((record, index) => {
    const filename = record.filename ?? "";
    return {
      key: `row-${index}`,
      title: record.title ?? "",
      abstract: record.abstract ?? "",
      tags: normalizeTagsCell(record.tags ?? ""),
      filename,
      file: filesByName.get(filename) ?? null,
      fileManuallySet: false,
    };
  });
}

function BulkRowItem({
  row,
  expanded,
  onToggleExpand,
  onUpdate,
  onToggleTag,
  submitState,
}: {
  row: ValidatedBulkRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<BulkRow>) => void;
  onToggleTag: (tag: string) => void;
  submitState?: SubmitState;
}) {
  const abstractWordCount = countWords(row.abstract);

  return (
    <>
      <TableRow>
        <TableCell>
          {row.status === "fail" && !submitState && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleExpand}
              aria-label={expanded ? "Collapse" : "Fix row"}
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
          {!submitState && row.status === "pass" && (
            <Badge className="gap-1 bg-primary/10 text-primary">
              <FiCheckCircle className="size-3" />
              Pass
            </Badge>
          )}
          {!submitState && row.status === "fail" && (
            <Badge variant="destructive" className="gap-1">
              <FiXCircle className="size-3" />
              Fail
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
          <div className="max-w-40 truncate text-xs">
            {row.file ? row.file.name : row.filename || "—"}
          </div>
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
      </TableRow>

      {expanded && row.status === "fail" && !submitState && (
        <TableRow>
          <TableCell colSpan={6} className="whitespace-normal bg-muted/30">
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
              <TagPicker
                selected={row.tags}
                onToggle={onToggleTag}
                label={`Tags (select at least ${MIN_TAGS})`}
                canManage
              />
              <FilePicker
                file={row.file}
                onChange={(nextFile) => onUpdate({ file: nextFile, fileManuallySet: true })}
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
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [submitResults, setSubmitResults] = useState<Record<string, SubmitState>>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const batchFilesRef = useRef<File[]>([]);

  useEffect(() => {
    batchFilesRef.current = batchFiles;
  }, [batchFiles]);

  const { data: vocabularyTags = [] } = useQuery({
    queryKey: ["tags", MAX_VOCABULARY_FETCH],
    queryFn: fetchAllTags,
  });
  const vocabularySet = useMemo(() => new Set(vocabularyTags), [vocabularyTags]);

  const handleCsvChange = (nextFile: File | null) => {
    setCsvFile(nextFile);
    setCsvError(null);
    setBulkSummary(null);
    setBulkError(null);
    setSubmitResults({});
    setExpandedRows(new Set());

    if (!nextFile) {
      setRows([]);
      return;
    }

    nextFile
      .text()
      .then((text) => {
        const records = parseCsvRecords(text);
        if (records.length === 0) {
          setCsvError("No rows found in this CSV.");
          setRows([]);
          return;
        }
        setRows(buildRowsFromRecords(records, batchFilesRef.current));
      })
      .catch(() => {
        setCsvError("Couldn't read that CSV file.");
        setRows([]);
      });
  };

  useEffect(() => {
    setRows((current) =>
      current.map((row) => {
        if (row.fileManuallySet) return row;
        const match = batchFiles.find((candidate) => candidate.name === row.filename) ?? null;
        return { ...row, file: match };
      })
    );
  }, [batchFiles]);

  const validatedRows: ValidatedBulkRow[] = useMemo(
    () => rows.map((row) => ({ ...row, ...validateBulkRow(row, vocabularySet) })),
    [rows, vocabularySet]
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
              Upload a CSV describing multiple resources, plus the files it references.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FilePicker
            file={csvFile}
            onChange={handleCsvChange}
            label="CSV file"
            accept=".csv"
            hint="Columns: title, abstract, tags, filename — tags separated by semicolons (;)"
          />
          <MultiFilePicker files={batchFiles} onChange={setBatchFiles} label="Resource files" />
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

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Details</TableHead>
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
                      submitState={submitResults[row.key]}
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-8">
        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
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
              <CardContent>{singleUploadForm}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">{bulkUploadCard}</TabsContent>
        </Tabs>
      </main>
    </AdminShell>
  );
}
