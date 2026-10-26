import * as React from "react";
import { cn } from "@/lib/utils";

// Fawnlight Card: paper slip; `lace` adds the scalloped hem, `blush` the misty pink paper
export function Card({
  className,
  lace,
  blush,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lace?: boolean; blush?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border text-card-foreground shadow-sm",
        blush ? "fl-lace-blush border-blush bg-muted" : "bg-card",
        lace && "fl-lace",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-xl font-semibold leading-tight", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}
