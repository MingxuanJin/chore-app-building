import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function DifficultyStars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`难度 ${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

export function DifficultyPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`难度 ${i}`} className="p-1">
          <Star className={cn("h-7 w-7", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}
