import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscussionBoard } from "@/components/discussion-board";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/require-page-session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  await requirePageSession(`/events/${id}`);
  const user = await getCurrentUser();
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      professor: {
        select: { name: true, email: true },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      liveSessions: {
        where: { isActive: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!event) {
    notFound();
  }

  const liveSession = event.liveSessions[0];

  return (
    <section className="space-y-6">
      <div className="rounded border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {event.professor.name ?? event.professor.email}
        </p>
        {event.description ? (
          <p className="mt-3 text-sm text-slate-700">{event.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-slate-500">
          {new Date(event.startTime).toLocaleString()} -{" "}
          {new Date(event.endTime).toLocaleString()}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.tags.map(
            (tag: { tagId: string; tag: { id: string; name: string; slug: string } }) => (
            <span
              key={tag.tagId}
              className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
            >
              {tag.tag.name}
            </span>
            ),
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href={(liveSession?.meetingUrl ?? event.meetingUrl) as string}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-slate-900 px-3 py-2 text-white"
          >
            Join Meeting
          </a>
          <Link
            href={`/api/discussions/${event.id}/export`}
            className="rounded border border-slate-300 px-3 py-2"
          >
            Export .txt
          </Link>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Threaded Discussion</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ask questions and reply in nested threads.
        </p>
        <div className="mt-4">
          <DiscussionBoard eventId={event.id} currentUserId={user?.id ?? null} />
        </div>
      </div>
    </section>
  );
}
