import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center",
        className,
      )}
      {...props}
    />
  );
}

export { Empty };
export { EmptyDescription } from "./empty-description";
export { EmptyHeader } from "./empty-header";
export { EmptyTitle } from "./empty-title";
