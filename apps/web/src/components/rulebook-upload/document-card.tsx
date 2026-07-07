import { AlertIcon, FileIcon, TrashIcon } from "@/assets/svgs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RulebookDocument } from "@/domain/rulebook";
import { cn } from "@/lib/utils";

import { formatSize } from "./format-size";
import { StatusBadge } from "./status-badge";

type DocumentCardProps = {
  document: RulebookDocument;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

export function DocumentCard({
  document,
  onRemove,
  onRetry,
}: DocumentCardProps) {
  const metaParts = [
    document.pdfName,
    formatSize(document.size),
    document.status === "ready" && document.pages
      ? `${document.pages} pages`
      : "",
  ].filter(Boolean);
  const roundedProgress = Math.round(document.progress);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
              document.status === "error" &&
                "bg-destructive/10 text-destructive",
            )}
          >
            <FileIcon stroke="currentColor" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {document.gameName}
              </span>
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {metaParts.join(" · ")}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={document.status} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${document.gameName}`}
              onClick={() => onRemove(document.id)}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>

        {document.status === "processing" ? (
          <div className="flex flex-col gap-2">
            <Progress value={roundedProgress} />
            <p className="text-sm text-muted-foreground">
              Extracting text · chunking · embedding — {roundedProgress}%
            </p>
          </div>
        ) : null}

        {document.status === "error" ? (
          <Alert variant="destructive">
            <AlertIcon />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                Could not extract text from this PDF. It may be scanned images.
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => onRetry(document.id)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
