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
        "flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[#dcd3fa] bg-white p-8 text-center transition-colors outline-none hover:bg-[#f8f6ff] focus-visible:ring-2 focus-visible:ring-[#6d5ef0]",
        isDragging && "border-[#6d5ef0] bg-[#f8f6ff]",
      )}
      onClick={onBrowse}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-[14px] bg-[#efebfc] text-[#6d5ef0] transition-colors",
          isDragging && "bg-[#6d5ef0] text-white",
        )}
      >
        <UploadIcon stroke="currentColor" />
      </span>
      <span className="text-sm font-semibold">
        {isDragging ? "Drop to upload" : "Drag a PDF here, or click to browse"}
      </span>
      <span className="text-[13.5px] text-[#b8b2a6]">PDF up to 40 MB</span>
    </button>
  );
}
