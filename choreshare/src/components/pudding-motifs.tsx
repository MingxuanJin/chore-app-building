import { cn } from "@/lib/utils";

/*
 * 布丁布丁 motifs, drawn in the system's style: 2.5px rounded cocoa outline,
 * custard / caramel / toast / blush fills. `pudding` and `paw` are the system's own
 * (assets/Motifs); the rest are original companions so each screen gets its own ornament.
 */
const LINE = { stroke: "#4A2C1E", strokeWidth: 2.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const C = {
  cream: "#FFFEF6",
  custard: "#FFF2A6",
  custardDeep: "#F5DC6E",
  caramel: "#8A5A3B",
  toast: "#E0662A",
  blush: "#F9C9BF",
  matcha: "#9CC48A",
  cocoa: "#4A2C1E",
};

const PUDDING_BODY = "M15 50 L20 22 Q32 16 44 22 L49 50 Q32 56 15 50 Z";
const PUDDING_TOP = "M20 22 Q32 16 44 22 L45.5 30 Q38 33 32 31 Q26 33 18.6 30 Z";

function Face({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="27" cy="40" r="1.8" fill={C.cocoa} />
      <circle cx="37" cy="40" r="1.8" fill={C.cocoa} />
      <ellipse cx="23.5" cy="44" rx="2.6" ry="1.6" fill={C.blush} />
      <ellipse cx="40.5" cy="44" rx="2.6" ry="1.6" fill={C.blush} />
      <path d="M30.5 43.5 Q32 45 33.5 43.5" fill="none" stroke={C.cocoa} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

const MOTIFS = {
  /** caramel pudding with a toast cherry (the system's own) */
  pudding: {
    box: "0 0 64 64",
    art: (
      <g {...LINE}>
        <ellipse cx="32" cy="54" rx="26" ry="6" fill={C.cream} />
        <path d={PUDDING_BODY} fill={C.custard} />
        <path d={PUDDING_TOP} fill={C.caramel} />
        <circle cx="32" cy="14" r="4.5" fill={C.toast} />
      </g>
    ),
  },
  /** a pudding wearing bunny ears: BunnyChore's mascot */
  bunnyPudding: {
    box: "0 0 64 64",
    art: (
      <>
        <g {...LINE}>
          <path d="M23 24 C17 10 19 2 24 3 C29 4 30 13 29 21" fill={C.custard} />
          <path d="M41 24 C47 10 45 2 40 3 C35 4 34 13 35 21" fill={C.custard} />
          <ellipse cx="32" cy="54" rx="26" ry="6" fill={C.cream} />
          <path d={PUDDING_BODY} fill={C.custard} />
          <path d={PUDDING_TOP} fill={C.caramel} />
        </g>
        <path d="M24.5 19 C22 11 22.5 6 24.5 6.5" fill="none" stroke={C.blush} strokeWidth="3" strokeLinecap="round" />
        <path d="M39.5 19 C42 11 41.5 6 39.5 6.5" fill="none" stroke={C.blush} strokeWidth="3" strokeLinecap="round" />
        <Face />
      </>
    ),
  },
  /** two little puddings side by side, with a heart: the couple */
  twinPuddings: {
    box: "0 0 100 64",
    art: (
      <>
        <g transform="translate(-4 4) scale(0.9)">
          <g {...LINE}>
            <ellipse cx="32" cy="54" rx="24" ry="5.5" fill={C.cream} />
            <path d={PUDDING_BODY} fill={C.custard} />
            <path d={PUDDING_TOP} fill={C.caramel} />
            <circle cx="32" cy="14" r="4.5" fill={C.toast} />
          </g>
          <Face />
        </g>
        <g transform="translate(46 10) scale(0.8)">
          <g {...LINE}>
            <path d="M24 24 C18 12 20 5 25 6 C29 7 30 14 29.5 21" fill={C.custard} />
            <path d="M40 24 C46 12 44 5 39 6 C35 7 34 14 34.5 21" fill={C.custard} />
            <ellipse cx="32" cy="54" rx="24" ry="5.5" fill={C.cream} />
            <path d={PUDDING_BODY} fill={C.custard} />
            <path d={PUDDING_TOP} fill={C.caramel} />
          </g>
          <Face />
        </g>
        <path d="M52 14 C49 9 43 12 47 17 L52 21 L57 17 C61 12 55 9 52 14 Z" fill={C.toast} {...LINE} strokeWidth={2} />
      </>
    ),
  },
  /** whisk: chores */
  whisk: {
    box: "0 0 64 64",
    art: (
      <g {...LINE} transform="rotate(-20 32 32)">
        <path d="M32 40 C17 30 21 5 32 5 C43 5 47 30 32 40 Z" fill={C.cream} />
        <path d="M32 40 C25 30 26 7 32 5 C38 7 39 30 32 40" fill="none" />
        <path d="M32 5 L32 40" fill="none" />
        <rect x="28.5" y="39" width="7" height="21" rx="3.5" fill={C.caramel} />
        <circle cx="32" cy="55" r="1.4" fill={C.cream} stroke="none" />
      </g>
    ),
  },
  /** fried egg */
  egg: {
    box: "0 0 64 64",
    art: (
      <g {...LINE}>
        <path d="M14 30 C10 16 26 8 35 12 C44 6 58 14 54 28 C60 38 50 54 36 50 C26 58 8 50 12 40 C8 36 10 32 14 30 Z" fill={C.cream} />
        <circle cx="33" cy="31" r="10" fill={C.custardDeep} />
        <path d="M28 27 Q30 24 33 24" fill="none" stroke={C.cream} strokeWidth="2.5" />
      </g>
    ),
  },
  /** teacup on a saucer */
  teacup: {
    box: "0 0 64 64",
    art: (
      <>
        <g fill="none" stroke={C.caramel} strokeWidth="2.5" strokeLinecap="round">
          <path d="M24 16 C21 12 27 9 24 4" />
          <path d="M33 16 C30 12 36 9 33 4" />
        </g>
        <g {...LINE}>
          <ellipse cx="30" cy="52" rx="24" ry="6" fill={C.cream} />
          <path d="M46 28 C56 26 56 40 44 40" fill="none" />
          <path d="M12 22 L48 22 C48 38 42 48 30 48 C18 48 12 38 12 22 Z" fill={C.blush} />
          <path d="M14 30 L46 30" fill="none" strokeDasharray="0.1 5" strokeWidth="3" stroke={C.cream} />
        </g>
      </>
    ),
  },
  /** a pair of cherries */
  cherry: {
    box: "0 0 64 64",
    art: (
      <g {...LINE}>
        <path d="M22 40 C24 26 30 16 40 8 M44 42 C44 28 42 18 40 8" fill="none" stroke={C.caramel} />
        <path d="M40 8 C46 2 56 4 58 10 C50 14 44 12 40 8 Z" fill={C.matcha} />
        <circle cx="21" cy="46" r="10" fill={C.toast} />
        <circle cx="44" cy="48" r="10" fill={C.toast} />
        <path d="M16 42 Q18 39 21 39" fill="none" stroke={C.blush} strokeWidth="2.5" />
        <path d="M39 44 Q41 41 44 41" fill="none" stroke={C.blush} strokeWidth="2.5" />
      </g>
    ),
  },
  /** star cookie with chocolate chips: rewards */
  cookie: {
    box: "0 0 64 64",
    art: (
      <g {...LINE}>
        <path
          d="M32 5 L39.5 21.5 L57 23.5 L44 35.5 L47.5 53 L32 44 L16.5 53 L20 35.5 L7 23.5 L24.5 21.5 Z"
          fill={C.custardDeep}
        />
        <circle cx="29" cy="25" r="2" fill={C.caramel} stroke="none" />
        <circle cx="38" cy="31" r="2" fill={C.caramel} stroke="none" />
        <circle cx="27" cy="36" r="2" fill={C.caramel} stroke="none" />
        <circle cx="35" cy="40" r="1.6" fill={C.caramel} stroke="none" />
      </g>
    ),
  },
  /** milk bottle: shopping */
  milk: {
    box: "0 0 64 64",
    art: (
      <g {...LINE}>
        <path d="M25 14 L39 14 L39 20 C45 24 46 28 46 34 L46 54 C46 57 44 59 41 59 L23 59 C20 59 18 57 18 54 L18 34 C18 28 19 24 25 20 Z" fill={C.cream} />
        <rect x="23" y="6" width="18" height="8" rx="3" fill={C.toast} />
        <path d="M18 38 L46 38 L46 50 L18 50 Z" fill={C.blush} strokeWidth="2" />
        <path d="M32 41 C30 40 28 42 30 44 L32 46 L34 44 C36 42 34 40 32 41 Z" fill={C.toast} stroke="none" />
      </g>
    ),
  },
  /** spoon with a scoop of custard */
  spoon: {
    box: "0 0 64 64",
    art: (
      <g {...LINE} transform="rotate(35 32 32)">
        <rect x="29" y="30" width="6" height="30" rx="3" fill={C.caramel} />
        <ellipse cx="32" cy="18" rx="12" ry="15" fill={C.cream} />
        <path d="M21 18 Q32 26 43 18 C43 26 38 32 32 32 C26 32 21 26 21 18 Z" fill={C.custard} strokeWidth="2" />
      </g>
    ),
  },
  /** paw print in the theme's caramel (the system's own) */
  paw: {
    box: "0 0 64 64",
    art: (
      <g className="fill-rose">
        <ellipse cx="32" cy="42" rx="14" ry="12" />
        <circle cx="15" cy="27" r="6" />
        <circle cx="25" cy="17" r="6" />
        <circle cx="39" cy="17" r="6" />
        <circle cx="49" cy="27" r="6" />
      </g>
    ),
  },
  /** a plate to set a number on; follows the theme so it stays quiet in both modes */
  plate: {
    box: "0 0 64 64",
    art: (
      <>
        <circle cx="32" cy="32" r="30" style={{ fill: "var(--paper-raised)", stroke: "var(--line-400)" }} strokeWidth="1.5" />
        <circle cx="32" cy="32" r="23" fill="none" style={{ stroke: "var(--line-400)" }} strokeWidth="1.2" strokeDasharray="2 3" />
      </>
    ),
  },
  /** caramel sauce dripping from the top edge of a card */
  drizzle: {
    box: "0 0 200 22",
    art: (
      <path
        d="M0 0 L200 0 L200 6 C194 6 193 9 192 13 C191 18 185 18 184 13 C183 8 180 6 170 6 C160 6 158 8 156 16 C154 23 147 23 146 16 C145 9 140 6 128 6 C118 6 115 9 114 11 C113 14 108 14 107 11 C106 7 100 6 88 6 C76 6 72 9 71 17 C70 22 63 22 62 17 C61 10 56 6 44 6 C34 6 31 9 30 12 C29 15 24 15 23 12 C22 8 16 6 0 6 Z"
        fill={C.caramel}
      />
    ),
  },
} as const;

export type MotifName = keyof typeof MOTIFS;

/** A 布丁布丁 ornament; size it with a width class (height follows the drawing). Always full strength: the Fawnlight fades muddy flat fills. */
export function Motif({ name, className }: { name: MotifName; className?: string }) {
  const m = MOTIFS[name];
  return (
    <svg viewBox={m.box} aria-hidden className={cn("pointer-events-none h-auto select-none overflow-visible", className, "opacity-100")}>
      {m.art}
    </svg>
  );
}
