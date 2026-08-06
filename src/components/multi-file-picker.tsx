"use client";

import { useRef, useState, type DragEvent } from "react";
import { FiUploadCloud, FiFile, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACCEPTED_RESOURCE_EXTENSIONS } from "@/components/file-picker";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function dedupeByName(files: File[]): File[] {
  const byName = new Map(files.map((file) => [file.name, file]));
  return [...byName.values()];
}

export function MultiFilePicker({
  files,
  onChange,
  label,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    onChange(dedupeByName([...files, ...Array.from(incoming)]));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (name: string) => {
    onChange(files.filter((file) => file.name !== name));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <FiUploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm">
          <span className="font-medium text-primary">Click to upload</span> or drag and
          drop multiple files
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOC, DOCX, PPT, PPTX, EPUB, or TXT &mdash; filenames must match the CSV
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_RESOURCE_EXTENSIONS}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent/50"
              >
                <FiFile className="size-3.5 shrink-0 text-primary" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(file.name)}
                  className="shrink-0 rounded-sm p-0.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <FiX className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
