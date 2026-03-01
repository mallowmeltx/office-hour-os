import { FollowTags } from "@/components/follow-tags";
import { requirePageSession } from "@/lib/require-page-session";

export default async function TagsPage() {
  await requirePageSession("/tags");

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tags & Programs</h1>
        <p className="text-sm text-slate-600">
          Follow categories like math or lecture-focused sessions.
        </p>
      </div>
      <FollowTags />
    </section>
  );
}
