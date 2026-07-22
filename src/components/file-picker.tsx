"use client";

import { useRef, useState, type DragEvent } from "react";
import { FiUploadCloud, FiFile, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.epub,.txt";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FilePicker({
  file,
  onChange,
  label,
  existingFileUrl,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label: string;
  existingFileUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
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
        {file ? (
          <>
            <FiFile className="size-6 text-primary" />
            <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)} &middot; click or drop to replace
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <FiX className="size-4" />
              Remove
            </Button>
          </>
        ) : (
          <>
            <FiUploadCloud className="size-6 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium text-primary">Click to upload</span> or drag
              and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, DOCX, PPT, PPTX, EPUB, or TXT
            </p>
            {existingFileUrl && (
              <a
                href={existingFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                View current file
              </a>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
