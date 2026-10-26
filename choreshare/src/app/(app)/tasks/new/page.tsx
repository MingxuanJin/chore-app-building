import { TaskForm } from "@/components/tasks/task-form";

export default function NewTaskPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">新建任务</h1>
      <TaskForm />
    </div>
  );
}
