import { AppTopbar } from "@/components/layout/app-topbar";
import { NotificationCenter } from "@/components/notifications/notification-center";

export default function NotificationsPage() {
  return (
    <>
      <AppTopbar title="Notifications" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <NotificationCenter />
        </div>
      </div>
    </>
  );
}
