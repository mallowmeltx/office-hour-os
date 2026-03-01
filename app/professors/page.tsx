import { FollowProfessors } from "@/components/follow-professors";
import { requirePageSession } from "@/lib/require-page-session";

export default async function ProfessorsPage() {
  await requirePageSession("/professors");

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Professors</h1>
        <p className="text-sm text-slate-600">
          Follow professors to only get notifications you care about.
        </p>
      </div>
      <FollowProfessors />
    </section>
  );
}
