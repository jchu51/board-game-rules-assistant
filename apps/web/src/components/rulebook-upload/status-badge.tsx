import { Badge } from "@/components/ui/badge";
import type { RulebookIndexStatus } from "@/domain/rulebook";

type StatusBadgeProps = {
  status: RulebookIndexStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "error") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (status === "processing") {
    return <Badge variant="outline">Indexing</Badge>;
  }

  return <Badge variant="secondary">Ready</Badge>;
}
