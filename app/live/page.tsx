import { LiveManager } from "@/components/live-manager";
import { getCurrentUser } from "@/lib/current-user";
import { requirePageSession } from "@/lib/require-page-session";

export default async function LivePage() {
  await requirePageSession("/live");
  const user = await getCurrentUser();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Live Now</h1>
        <p className="text-sm text-slate-600">
          Professors can set their live status and students can join instantly.
        </p>
      </div>
      <LiveManager canManageLive={user?.role === "PROFESSOR"} />
    </section>
  );
}
