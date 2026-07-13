import { FileIcon, XIcon } from "@/assets/svgs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { formatSize } from "./format-size";

type SelectedFileCardProps = {
  file: File;
  onClear: () => void;
};

export function SelectedFileCard({ file, onClear }: SelectedFileCardProps) {
  return (
    <Card className="rounded-[14px] border-[#edeae3] bg-[#f8f6ff] shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#efebfc] text-[#6d5ef0]">
          <FileIcon stroke="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{file.name}</div>
          <div className="text-[13.5px] text-[#5b5648]">
            {formatSize(file.size)} · ready to upload
          </div>
        </div>
        <Button
          id="library-clear-selected-file-btn"
          data-testid="library-clear-selected-file-btn"
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear selected file"
          onClick={onClear}
        >
          <XIcon />
        </Button>
      </CardContent>
    </Card>
  );
}
