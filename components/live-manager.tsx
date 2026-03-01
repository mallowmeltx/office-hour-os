"use client";

import { FormEvent, useEffect, useState } from "react";

type LiveSession = {
  id: string;
  topic: string;
  meetingUrl: string;
  startedAt: string;
  professor: {
    id: string;
    name: string | null;
    email: string;
  };
  event: {
    id: string;
    title: string;
  } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

type EventOption = {
  id: string;
  title: string;
};

type TagOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  canManageLive: boolean;
};

function parseMaybeJson(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const value = data.error;
  return typeof value === "string" ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function LiveManager({ canManageLive }: Props) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: "",
    meetingUrl: "",
    eventId: "",
    tagIds: [] as string[],
  });

  async function load() {
    const [sessionsResponse, eventsResponse, tagsResponse] = await Promise.all([
      fetch("/api/live", { cache: "no-store" }),
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/tags", { cache: "no-store" }),
    ]);

    const [sessionsText, eventsText, tagsText] = await Promise.all([
      sessionsResponse.text(),
      eventsResponse.text(),
      tagsResponse.text(),
    ]);
    const sessionsData = parseMaybeJson(sessionsText);
    const eventsData = parseMaybeJson(eventsText);
    const tagsData = parseMaybeJson(tagsText);

    if (!sessionsResponse.ok) {
      setLoadError(readErrorMessage(sessionsData, "Failed to load live sessions."));
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoadError(null);

    setSessions(asArray<LiveSession>(sessionsData.sessions));
    setEvents(
      asArray<EventOption>(eventsData.events).map((event: EventOption) => ({
        id: event.id,
        title: event.title,
      })),
    );
    setTags(asArray<TagOption>(tagsData.tags).map((tag: TagOption) => tag));
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    const interval = setInterval(() => {
      void load();
    }, 10000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  function toggleTag(tagId: string) {
    setForm((previous) => ({
      ...previous,
      tagIds: previous.tagIds.includes(tagId)
        ? previous.tagIds.filter((id) => id !== tagId)
        : [...previous.tagIds, tagId],
    }));
  }

  async function goLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: form.topic,
        meetingUrl: form.meetingUrl,
        eventId: form.eventId || undefined,
        tagIds: form.tagIds,
      }),
    });

    if (response.ok) {
      setForm({ topic: "", meetingUrl: "", eventId: "", tagIds: [] });
      await load();
    }
  }

  async function endSession(sessionId: string) {
    await fetch(`/api/live/${sessionId}/end`, { method: "PATCH" });
    await load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading live state...</p>;

  if (loadError) {
    return <p className="text-sm text-rose-700">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      {canManageLive ? (
        <form onSubmit={goLive} className="rounded border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900">Go Live</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={form.topic}
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
              placeholder="Live topic"
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.meetingUrl}
              onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
              placeholder="Meeting URL"
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <select
            value={form.eventId}
            onChange={(event) => setForm({ ...form, eventId: event.target.value })}
            className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No linked event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded border px-3 py-1 text-sm ${
                  form.tagIds.includes(tag.id)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <button className="mt-4 rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Start Live Session
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{session.topic}</p>
            <p className="text-sm text-slate-600">
              {session.professor.name ?? session.professor.email}
            </p>
            {session.event ? (
              <p className="text-sm text-slate-500">Event: {session.event.title}</p>
            ) : null}
            {session.tags.length > 0 ? (
              <p className="text-sm text-slate-500">
                Tags: {session.tags.map((item) => item.tag.name).join(", ")}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="text-indigo-600">
                Join
              </a>
              {canManageLive ? (
                <button
                  onClick={() => endSession(session.id)}
                  className="text-rose-600"
                >
                  End
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions right now.</p>
        ) : null}
      </div>
    </div>
  );
}
