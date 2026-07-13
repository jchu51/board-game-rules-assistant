import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function EmptyDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
