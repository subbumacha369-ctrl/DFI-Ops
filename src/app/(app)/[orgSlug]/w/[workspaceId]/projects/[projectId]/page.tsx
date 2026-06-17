import { AppTopbar } from "@/components/layout/app-topbar";
import { ProjectDetail } from "@/components/work/project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <AppTopbar title="Project" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <ProjectDetail projectId={projectId} />
        </div>
      </div>
    </>
  );
}
