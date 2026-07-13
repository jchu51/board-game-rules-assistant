import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex flex-col items-center gap-1", className)}
      {...props}
    />
  );
}
