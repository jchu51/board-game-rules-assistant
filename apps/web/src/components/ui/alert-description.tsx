import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function AlertDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground col-start-2 text-sm", className)}
      {...props}
    />
  );
}
