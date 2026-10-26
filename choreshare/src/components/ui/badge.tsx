import * as React from "react";
import { cn } from "@/lib/utils";

// Fawnlight Tag: typewriter label on a soft fill
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-blush px-2.5 py-0.5 font-mono text-[12px] leading-4 tracking-wide text-foreground",
        className
      )}
      {...props}
    />
  );
}
