import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
export { CardContent } from "./card-content";
export { CardDescription } from "./card-description";
export { CardFooter } from "./card-footer";
export { CardHeader } from "./card-header";
export { CardTitle } from "./card-title";
