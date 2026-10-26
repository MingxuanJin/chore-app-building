import { TaskForm } from "@/components/tasks/task-form";
import { PageTitle } from "@/components/page-title";

export default function NewTaskPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle k="taskForm.newTitle" />
      <TaskForm />
    </div>
  );
}
