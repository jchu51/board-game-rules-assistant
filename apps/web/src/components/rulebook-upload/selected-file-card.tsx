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
    <Card className="rounded-2xl border-border bg-background shadow-[0_1px_2px_rgb(0_0_0_/0.04)]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <FileIcon stroke="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{file.name}</div>
          <div className="text-base text-muted-foreground">
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
