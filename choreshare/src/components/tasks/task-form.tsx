"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RecurrenceType, RecurrenceValue, Task } from "@/types/database";
import { WEEKDAYS, todayISO } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { DifficultyPicker } from "./difficulty";

type AssignMode = "open" | "me" | "partner";

export function TaskForm({ task }: { task?: Task }) {
  const router = useRouter();
  const { me, partner, family } = useFamily();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [difficulty, setDifficulty] = useState(task?.difficulty ?? 2);
  const [estimated, setEstimated] = useState(task?.estimated_minutes?.toString() ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? todayISO());
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence_type ?? "none");
  const [intervalDays, setIntervalDays] = useState(task?.recurrence_value?.interval ?? 2);
  const [days, setDays] = useState<number[]>(task?.recurrence_value?.days ?? [new Date().getDay()]);
  const [monthDay, setMonthDay] = useState(task?.recurrence_value?.day ?? new Date().getDate());
  const [assign, setAssign] = useState<AssignMode>(
    !task || !task.assigned_to ? "open" : task.assigned_to === me.id ? "me" : "partner"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only allow changing assignment before work starts
  const canReassign = !task || ["pending", "claimed"].includes(task.status);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let recurrence_value: RecurrenceValue | null = null;
    if (recurrence === "every_n_days") recurrence_value = { interval: intervalDays };
    if (recurrence === "weekly") recurrence_value = { days };
    if (recurrence === "monthly") recurrence_value = { day: monthDay };
    if (recurrence !== "none" && assign === "open") recurrence_value = { ...recurrence_value, open: true };

    const assigned_to = assign === "me" ? me.id : assign === "partner" ? (partner?.id ?? null) : null;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      difficulty,
      estimated_minutes: estimated ? Number(estimated) : null,
      due_date: dueDate || null,
      recurrence_type: recurrence,
      recurrence_value,
      ...(canReassign ? { assigned_to, status: assigned_to ? "claimed" : "pending" } : {}),
    };

    const supabase = createClient();
    const { data, error } = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id).select("id").single()
      : await supabase
          .from("tasks")
          .insert({ ...payload, family_id: family.id, created_by: me.id })
          .select("id")
          .single();

    setSaving(false);
    if (error) return setError(error.message);
    router.replace(`/tasks/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">任务名称</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：拖地、洗碗" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="desc">描述（可选）</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>难度</Label>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">积分 = 难度 × 每 15 分钟</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="est">预估时长（分钟）</Label>
          <Input id="est" type="number" min={1} value={estimated} onChange={(e) => setEstimated(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="due">日期</Label>
          <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rec">重复</Label>
        <Select id="rec" value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}>
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="every_n_days">每 N 天</option>
          <option value="weekly">每周指定几天</option>
          <option value="monthly">每月指定日期</option>
        </Select>
        {recurrence === "every_n_days" && (
          <div className="flex items-center gap-2 text-sm">
            每
            <Input type="number" min={1} max={365} value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))} className="w-20" />
            天
          </div>
        )}
        {recurrence === "weekly" && (
          <div className="flex gap-1">
            {WEEKDAYS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
                className={cn(
                  "h-9 w-9 rounded-full border text-sm",
                  days.includes(i) ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {recurrence === "monthly" && (
          <div className="flex items-center gap-2 text-sm">
            每月
            <Input type="number" min={1} max={31} value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className="w-20" />
            日
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>分配给</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["open", "待认领"],
              ["me", "我"],
              ["partner", partner?.name || "TA"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              disabled={!canReassign || (mode === "partner" && !partner)}
              onClick={() => setAssign(mode)}
              className={cn(
                "h-10 rounded-md border text-sm disabled:opacity-40",
                assign === mode ? "border-primary bg-primary/10 font-medium text-primary" : "bg-background"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {!partner && <p className="text-xs text-muted-foreground">对方还没加入，可以在设置页把配对码发给 TA。</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={saving || (recurrence === "weekly" && days.length === 0)}>
        {saving ? "保存中…" : task ? "保存修改" : "创建任务"}
      </Button>
    </form>
  );
}
