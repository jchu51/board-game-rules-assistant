import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function EmptyTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-foreground text-sm font-medium", className)}
      {...props}
    />
  );
}
