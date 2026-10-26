"use client";

import Link from "next/link";
import { ChevronRight, Plus, ShoppingCart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFamily } from "@/components/family-provider";
import { usePoints } from "@/components/use-points";
import { useTasks } from "@/components/tasks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { todayISO } from "@/lib/tasks";
import type { Task } from "@/types/database";

export default function DashboardPage() {
  const { me, partner } = useFamily();
  const { tasks, loading } = useTasks(10);
  const { points } = usePoints();
  const today = todayISO();

  const dueNow = (t: Task) => !t.due_date || t.due_date <= today;
  const toReview = tasks.filter((t) => t.status === "review" && t.assigned_to !== me.id);
  const mine = tasks.filter(
    (t) => t.assigned_to === me.id && ["claimed", "in_progress", "rejected"].includes(t.status) && dueNow(t)
  );
  const open = tasks.filter((t) => t.status === "pending" && dueNow(t));
  const doneToday = tasks.filter((t) => t.status === "completed" && t.updated_at.slice(0, 10) === today);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">你好，{me.name || "我"} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {mine.length + open.length === 0 ? "今天的家务都搞定了！" : `今天还有 ${mine.length + open.length} 件事要做`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PointsCard label="我的积分" value={points[me.id]?.balance ?? 0} highlight />
        <PointsCard label={`${partner?.name || "TA"}的积分`} value={partner ? (points[partner.id]?.balance ?? 0) : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tasks/new" className={buttonVariants({ variant: "outline" })}>
          <Plus /> 新建任务
        </Link>
        <Link href="/shopping" className={buttonVariants({ variant: "outline" })}>
          <ShoppingCart /> 购物清单
        </Link>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
      ) : (
        <>
          <Section title="等我确认" tasks={toReview} accent />
          <Section title="我的今日待办" tasks={mine} empty="没有待办，去认领一个吧" />
          <Section title="待认领" tasks={open} />
          <Section title="今天已完成" tasks={doneToday} />
        </>
      )}
    </div>
  );
}

function PointsCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "bg-primary text-primary-foreground" : ""}>
      <CardContent className="pt-4">
        <p className={`text-xs ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, tasks, empty, accent }: { title: string; tasks: Task[]; empty?: string; accent?: boolean }) {
  if (tasks.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${accent ? "text-orange-600" : "text-muted-foreground"}`}>
          {title} {tasks.length > 0 && `(${tasks.length})`}
        </h2>
        <Link href="/tasks" className="flex items-center text-xs text-muted-foreground">
          全部 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        tasks.map((t) => <TaskCard key={t.id} task={t} />)
      )}
    </section>
  );
}
