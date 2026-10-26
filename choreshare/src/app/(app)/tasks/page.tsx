"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { useTasks } from "@/components/tasks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "mine", label: "我的" },
  { key: "open", label: "待认领" },
  { key: "review", label: "待确认" },
  { key: "done", label: "已完成" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

export default function TasksPage() {
  const { me } = useFamily();
  const { tasks, loading } = useTasks();
  const [filter, setFilter] = useState<Filter>("all");

  const shown = tasks.filter((t) => {
    switch (filter) {
      case "all":
        return t.status !== "completed";
      case "mine":
        return t.status !== "completed" && t.assigned_to === me.id;
      case "open":
        return t.status === "pending";
      case "review":
        return t.status === "review";
      case "done":
        return t.status === "completed";
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">任务</h1>
        <Link href="/tasks/new" className={buttonVariants({ size: "sm" })}>
          <Plus /> 新建
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm",
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-background"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">这里空空的 ✨</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
