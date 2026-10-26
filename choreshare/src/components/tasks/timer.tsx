"use client";

import { useEffect, useState } from "react";
import type { TaskSession } from "@/types/database";
import { formatDuration, sessionSeconds } from "@/lib/tasks";

/**
 * Live timer. Time is derived from timestamps stored in the DB, so it keeps
 * counting while the page is closed and stays in sync across devices.
 */
export function TimerDisplay({ sessions }: { sessions: TaskSession[] }) {
  const [now, setNow] = useState(() => Date.now());
  const running = sessions.some((s) => !s.ended_at && !s.paused_at);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const total = sessions.reduce((sum, s) => sum + sessionSeconds(s, now), 0);
  return <div className="font-mono text-5xl font-semibold lining-nums tabular-nums tracking-tight">{formatDuration(total)}</div>;
}
