import { AppTopbar } from "@/components/layout/app-topbar";
import { TaskBoard } from "@/components/work/task-board";

export default function TasksPage() {
  return (
    <>
      <AppTopbar title="Tasks" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <TaskBoard />
        </div>
      </div>
    </>
  );
}
