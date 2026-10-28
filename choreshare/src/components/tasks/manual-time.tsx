"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { calcPoints, formatMinutes } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { MAX_MANUAL_MINUTES } from "./actions";

const QUICK = [15, 30, 45, 60, 90];

/** Type in how long a task took instead of timing it. */
export function ManualTimeForm({
  difficulty,
  priorMinutes,
  partnerName,
  busy,
  onSubmit,
  onCancel,
}: {
  difficulty: number;
  /** time already logged on this task (e.g. before a rejection); points are for the total */
  priorMinutes: number;
  partnerName: string;
  busy: boolean;
  onSubmit: (minutes: number) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const valid = Number.isInteger(total) && total > 0 && total <= MAX_MANUAL_MINUTES;

  function pick(m: number) {
    setHours(m >= 60 ? String(Math.floor(m / 60)) : "");
    setMins(m % 60 ? String(m % 60) : "");
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(total);
      }}
    >
      <p className="text-center text-sm text-muted-foreground">{t("taskDetail.manualHint")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={total === m}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              total === m ? "border-transparent bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"
            )}
          >
            {formatMinutes(t, m)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-hours">{t("taskDetail.hours")}</Label>
          <Input
            id="manual-hours"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            step={1}
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manual-minutes">{t("taskDetail.minutes")}</Label>
          <Input
            id="manual-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            placeholder="0"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
          />
        </div>
      </div>
      <p className={cn("text-center text-sm", total > 0 && !valid ? "text-destructive" : "text-muted-foreground")}>
        {total > 0 && !valid
          ? t("taskDetail.manualInvalid")
          : valid
            ? t("taskDetail.manualPreview", { duration: formatMinutes(t, total), points: calcPoints(difficulty, priorMinutes + total) })
            : " "}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={busy || !valid}>
          <Send /> {t("taskDetail.manualSubmit")}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("taskDetail.manualWho", { name: partnerName })}</p>
    </form>
  );
}
