import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function CardDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
