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
import { useI18n } from "@/components/i18n-provider";
import type { Task } from "@/types/database";
import { Art, LaceDivider, SectionTitle } from "@/components/fawn";

export default function DashboardPage() {
  const { me, partner } = useFamily();
  const { t, dateLocale } = useI18n();
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
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Art name="asciiFawn" className="absolute -top-2 right-0 w-32 opacity-80" priority />
        <div className="relative pt-2">
          <p suppressHydrationWarning className="font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })} · {t("deco.home")}
          </p>
          <h1 className="font-serif text-[32px] font-medium leading-[38px]">
            {me.name ? t("dashboard.hello", { name: me.name }) : t("setup.helloNoName")}
          </h1>
          <p className="font-serif text-lg italic text-muted-foreground">
            {mine.length + open.length === 0 ? t("dashboard.allDone") : t("dashboard.remaining", { n: mine.length + open.length })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PointsCard label={t("dashboard.myPoints")} value={points[me.id]?.balance ?? 0} highlight />
        <PointsCard label={t("dashboard.partnerPoints", { name: partner?.name || t("common.partner") })} value={partner ? (points[partner.id]?.balance ?? 0) : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tasks/new" className={buttonVariants()}>
          <Plus /> {t("dashboard.newTask")}
        </Link>
        <Link href="/shopping" className={buttonVariants({ variant: "outline" })}>
          <ShoppingCart /> {t("dashboard.shoppingList")}
        </Link>
      </div>

      <LaceDivider />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <Section title={t("dashboard.toReview")} tasks={toReview} accent />
          <Section title={t("dashboard.myToday")} tasks={mine} empty={t("dashboard.noTodo")} />
          <Section title={t("dashboard.open")} tasks={open} />
          <Section title={t("dashboard.doneToday")} tasks={doneToday} />
        </>
      )}
    </div>
  );
}

function PointsCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card lace blush={highlight}>
      <CardContent className="pt-4">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="font-serif text-[40px] font-medium leading-[46px] lining-nums tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, tasks, empty, accent }: { title: string; tasks: Task[]; empty?: string; accent?: boolean }) {
  const { t } = useI18n();
  if (tasks.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionTitle count={tasks.length} className={accent ? "text-attention" : undefined}>
          {title}
        </SectionTitle>
        <Link href="/tasks" className="flex items-center text-sm italic text-muted-foreground hover:text-foreground">
          {t("common.all")} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="fl-note font-serif text-lg italic text-muted-foreground">{empty}</p>
      ) : (
        tasks.map((t) => <TaskCard key={t.id} task={t} />)
      )}
    </section>
  );
}
