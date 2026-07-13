import { Badge } from "@/components/ui/badge";
import type { RulebookIndexStatus } from "@/domain/rulebook";

type StatusBadgeProps = {
  status: RulebookIndexStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "error") {
    return (
      <Badge
        className="rounded-full bg-[#fee2e2] px-[11px] py-[3px] text-[11.5px] text-[#c0362c]"
        variant="destructive"
      >
        Failed
      </Badge>
    );
  }

  if (status === "processing") {
    return (
      <Badge
        className="rounded-full bg-[#efebfc] px-[11px] py-[3px] text-[11.5px] text-[#6d5ef0]"
        variant="secondary"
      >
        Indexing
      </Badge>
    );
  }

  return (
    <Badge
      className="rounded-full bg-[#e3fbf0] px-[11px] py-[3px] text-[11.5px] font-semibold text-[#12875a]"
      variant="secondary"
    >
      Ready
    </Badge>
  );
}
