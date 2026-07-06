import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

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
  )
}

function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex flex-col items-center gap-1", className)}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-foreground text-sm font-medium", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export { Empty, EmptyDescription, EmptyHeader, EmptyTitle }
