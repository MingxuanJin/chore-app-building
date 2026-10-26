import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/task-form";
import { PageTitle } from "@/components/page-title";
import type { Task } from "@/types/database";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).single<Task>();
  if (!task) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle k="taskForm.editTitle" />
      <TaskForm task={task} />
    </div>
  );
}
