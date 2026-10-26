import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * Fawnlight ornaments (assets from the design system, in /public/fawnlight).
 * Rules: one creature or keepsake per screen, at most four ornaments, always decorative (alt="").
 */
const ART = {
  rabbit: { src: "/fawnlight/white-rabbit.webp", w: 360, h: 474 },
  angelBunny: { src: "/fawnlight/angel-bunny.webp", w: 360, h: 414 },
  lily: { src: "/fawnlight/lily.webp", w: 360, h: 292 },
  lilyPetal: { src: "/fawnlight/lily-petal.webp", w: 300, h: 280 },
  bow: { src: "/fawnlight/satin-bow.webp", w: 240, h: 189 },
  clock: { src: "/fawnlight/rose-clock.webp", w: 240, h: 322 },
  piano: { src: "/fawnlight/porcelain-piano.webp", w: 240, h: 287 },
  doily: { src: "/fawnlight/lace-doily-blush.webp", w: 400, h: 400 },
  swag: { src: "/fawnlight/lace-bow-swag-blush.webp", w: 994, h: 112 },
  asciiFawn: { src: "/fawnlight/ascii-fawn.webp", w: 320, h: 280 },
  asciiRabbit: { src: "/fawnlight/ascii-rabbit.webp", w: 320, h: 419 },
  asciiLily: { src: "/fawnlight/ascii-lily.webp", w: 320, h: 256 },
  star: { src: "/fawnlight/chrome-star.svg", w: 400, h: 390 },
  garland: { src: "/fawnlight/pearl-garland.svg", w: 600, h: 110 },
} as const;

export type ArtName = keyof typeof ART;

/** A decorative ornament; size it with a width class (height follows). */
export function Art({ name, className, priority }: { name: ArtName; className?: string; priority?: boolean }) {
  const a = ART[name];
  return (
    <Image
      src={a.src}
      width={a.w}
      height={a.h}
      alt=""
      aria-hidden
      priority={priority}
      draggable={false}
      className={cn("pointer-events-none h-auto select-none", className)}
    />
  );
}

/** Page title block: typewriter eyebrow, Cormorant title, optional ornament and action. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  art,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  art?: ArtName;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-end justify-between gap-3 pt-2">
      {/* the ornament floats right, or sits before the title when an action takes the right side */}
      {art && !action && <Art name={art} className="absolute -top-1 right-0 w-20 opacity-90" />}
      <div className="relative flex min-w-0 items-end gap-2">
        {art && action && <Art name={art} className="w-12 shrink-0" />}
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="font-serif text-[32px] font-medium leading-[38px]">{title}</h1>
          {subtitle && <p className="mt-0.5 font-serif text-lg italic text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="relative shrink-0">{action}</div>}
    </div>
  );
}

/** Section heading in Cormorant with an optional count tag. */
export function SectionTitle({ children, count, className }: { children: React.ReactNode; count?: number; className?: string }) {
  return (
    <h2 className={cn("flex items-center gap-2 font-serif text-xl font-semibold", className)}>
      {children}
      {!!count && <span className="rounded-full bg-blush px-2 font-mono text-xs font-normal">{count}</span>}
    </h2>
  );
}

/** Lace divider with an ornament or a short script word in the middle. */
export function LaceDivider({ art = "bow", word }: { art?: ArtName; word?: string }) {
  return (
    <div className="fl-divider" aria-hidden>
      {word ? (
        <span className="font-script text-[28px] leading-8 text-rose">{word}</span>
      ) : (
        <Art name={art} className="w-11" />
      )}
    </div>
  );
}

/** Empty state: faded ASCII creature over a ruled note. */
export function EmptyNote({ children, art = "asciiLily" }: { children: React.ReactNode; art?: ArtName }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <Art name={art} className="w-28 opacity-70" />
      <p className="text-center font-serif text-lg italic text-muted-foreground">{children}</p>
    </div>
  );
}
