import { NotificationsList } from "@/components/notifications-list";
import { requirePageSession } from "@/lib/require-page-session";

export default async function NotificationsPage() {
  await requirePageSession("/notifications");

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-600">
          Event and live updates from professors or tags you follow.
        </p>
      </div>
      <NotificationsList />
    </section>
  );
}
