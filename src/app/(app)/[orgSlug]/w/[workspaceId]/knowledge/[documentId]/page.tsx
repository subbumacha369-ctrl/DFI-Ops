import { AppTopbar } from "@/components/layout/app-topbar";
import { DocumentEditor } from "@/components/knowledge/document-editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return (
    <>
      <AppTopbar title="Document" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <DocumentEditor documentId={documentId} />
        </div>
      </div>
    </>
  );
}
