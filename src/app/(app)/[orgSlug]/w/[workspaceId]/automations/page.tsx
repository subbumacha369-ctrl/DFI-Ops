import { AppTopbar } from "@/components/layout/app-topbar";
import { AutomationsList } from "@/components/automation/automations-list";

export default function AutomationsPage() {
  return (
    <>
      <AppTopbar title="Automations" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <AutomationsList />
        </div>
      </div>
    </>
  );
}
