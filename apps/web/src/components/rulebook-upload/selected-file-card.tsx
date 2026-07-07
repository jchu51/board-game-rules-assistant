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
    <Card className="bg-muted/30 shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileIcon stroke="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-sm text-muted-foreground">
            {formatSize(file.size)} · ready to upload
          </div>
        </div>
        <Button
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
