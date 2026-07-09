import type { DragEvent } from "react";

import { UploadIcon } from "@/assets/svgs";
import { cn } from "@/lib/utils";

type DropzoneProps = {
  isDragging: boolean;
  onBrowse: () => void;
  onDragStateChange: (isDragging: boolean) => void;
  onFile: (file: File | undefined) => void;
};

export function Dropzone({
  isDragging,
  onBrowse,
  onDragStateChange,
  onFile,
}: DropzoneProps) {
  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onDragStateChange(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onDragStateChange(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onFile(event.dataTransfer.files[0]);
  };

  return (
    <button
      id="library-rulebook-dropzone-btn"
      data-testid="library-rulebook-dropzone-btn"
      type="button"
      className={cn(
        "flex min-h-[208px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-background p-8 text-center transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
        isDragging && "border-primary bg-primary/5",
      )}
      onClick={onBrowse}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors",
          isDragging && "bg-primary text-primary-foreground",
        )}
      >
        <UploadIcon stroke="currentColor" />
      </span>
      <span className="text-base font-medium">
        {isDragging ? "Drop to upload" : "Drag a PDF here, or click to browse"}
      </span>
      <span className="text-base text-muted-foreground">PDF up to 40 MB</span>
    </button>
  );
}
