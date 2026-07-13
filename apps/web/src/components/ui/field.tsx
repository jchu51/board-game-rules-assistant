import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export { FieldGroup };
export { Field } from "./field-item";
export { FieldDescription } from "./field-description";
export { FieldError } from "./field-error";
export { FieldLabel } from "./field-label";
