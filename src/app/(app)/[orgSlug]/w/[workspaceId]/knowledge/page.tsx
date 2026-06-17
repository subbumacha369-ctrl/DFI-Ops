import { AppTopbar } from "@/components/layout/app-topbar";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";

export default function KnowledgePage() {
  return (
    <>
      <AppTopbar title="Knowledge Base" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <KnowledgeList />
        </div>
      </div>
    </>
  );
}
