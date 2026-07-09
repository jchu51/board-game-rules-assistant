import { Badge } from "@/components/ui/badge";
import type { RulebookIndexStatus } from "@/domain/rulebook";

type StatusBadgeProps = {
  status: RulebookIndexStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "error") {
    return (
      <Badge className="rounded-full px-3 py-0.5 text-sm" variant="destructive">
        Failed
      </Badge>
    );
  }

  if (status === "processing") {
    return (
      <Badge
        className="rounded-full bg-muted px-3 py-0.5 text-sm"
        variant="secondary"
      >
        Indexing
      </Badge>
    );
  }

  return (
    <Badge
      className="rounded-full bg-muted px-3 py-0.5 text-sm font-medium"
      variant="secondary"
    >
      Ready
    </Badge>
  );
}
