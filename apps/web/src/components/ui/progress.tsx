import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type ProgressProps = ComponentProps<"div"> & {
  value?: number
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      data-slot="progress"
      className={cn(
        "bg-secondary relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-transform"
        style={{ transform: `translateX(-${100 - normalizedValue}%)` }}
      />
    </div>
  )
}

export { Progress }
