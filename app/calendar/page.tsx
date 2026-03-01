import { EventsCalendar } from "@/components/events-calendar";
import { getCurrentUser } from "@/lib/current-user";
import { requirePageSession } from "@/lib/require-page-session";

export default async function CalendarPage() {
  await requirePageSession("/calendar");
  const user = await getCurrentUser();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upcoming Events</h1>
        <p className="text-sm text-slate-600">
          Browse office hours and quickly join active or upcoming rooms.
        </p>
      </div>
      <EventsCalendar
        isProfessor={user?.role === "PROFESSOR"}
        currentUserId={user?.id ?? null}
      />
    </section>
  );
}
