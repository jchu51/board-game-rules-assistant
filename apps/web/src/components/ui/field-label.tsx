import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-foreground text-sm leading-none font-medium",
        className,
      )}
      {...props}
    />
  );
}
