import { AppTopbar } from "@/components/layout/app-topbar";
import { ProjectsList } from "@/components/work/projects-list";

export default function ProjectsPage() {
  return (
    <>
      <AppTopbar title="Projects" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <ProjectsList />
        </div>
      </div>
    </>
  );
}
