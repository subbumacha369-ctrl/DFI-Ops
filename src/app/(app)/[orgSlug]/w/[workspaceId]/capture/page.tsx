import { AppTopbar } from "@/components/layout/app-topbar";
import { CapturePipeline } from "@/components/ai/capture-pipeline";

export default function CapturePage() {
  return (
    <>
      <AppTopbar title="AI Capture" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <CapturePipeline />
        </div>
      </div>
    </>
  );
}
