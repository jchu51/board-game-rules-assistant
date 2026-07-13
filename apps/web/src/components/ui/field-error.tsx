import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      className={cn("text-destructive text-sm", className)}
      {...props}
    />
  );
}
