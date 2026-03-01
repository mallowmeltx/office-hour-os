"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

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
  status: string;
  professor: {
    id: string;
  };
};

type TagOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  canManageLive: boolean;
  currentUserId: string | null;
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

export function LiveManager({ canManageLive, currentUserId }: Props) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: "",
    meetingUrl: "",
    eventId: "",
    tagIds: [] as string[],
  });
  const useLinkedEventTags = form.eventId !== "";
  const eligibleEvents = events.filter(
    (event) => event.professor.id === currentUserId && event.status === "SCHEDULED",
  );

  const loadAll = useCallback(async () => {
    const eventsUrl = currentUserId
      ? `/api/events?professorId=${encodeURIComponent(currentUserId)}`
      : "/api/events";
    const [sessionsResponse, eventsResponse, tagsResponse] = await Promise.all([
      fetch("/api/live", { cache: "no-store" }),
      fetch(eventsUrl, { cache: "no-store" }),
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
    if (!eventsResponse.ok) {
      setEventsLoadError(
        readErrorMessage(eventsData, "Failed to load your scheduled events."),
      );
      setEvents([]);
    } else {
      setEventsLoadError(null);
      setEvents(
        asArray<EventOption>(eventsData.events).map((event: EventOption) => ({
          id: event.id,
          title: event.title,
          status: event.status,
          professor: { id: event.professor.id },
        })),
      );
    }
    if (tagsResponse.ok) {
      setTags(asArray<TagOption>(tagsData.tags).map((tag: TagOption) => tag));
    }
    setLoading(false);
  }, [currentUserId]);

  const refreshSessions = useCallback(async () => {
    const response = await fetch("/api/live", { cache: "no-store" });
    const text = await response.text();
    const data = parseMaybeJson(text);

    if (!response.ok) {
      setLoadError(readErrorMessage(data, "Failed to load live sessions."));
      return;
    }

    setLoadError(null);
    setSessions(asArray<LiveSession>(data.sessions));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadAll();
    }, 0);
    const interval = setInterval(() => {
      void refreshSessions();
    }, 10000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loadAll, refreshSessions]);

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
    setFormError(null);
    const response = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: form.topic,
        meetingUrl: useLinkedEventTags ? undefined : form.meetingUrl,
        eventId: form.eventId || undefined,
        tagIds: form.tagIds,
      }),
    });

    const responseText = await response.text();
    const responseData = parseMaybeJson(responseText);

    if (response.ok) {
      setForm({ topic: "", meetingUrl: "", eventId: "", tagIds: [] });
      await loadAll();
      return;
    }

    setFormError(
      readErrorMessage(responseData, "Could not start live session. Please try again."),
    );
  }

  async function endSession(sessionId: string) {
    await fetch(`/api/live/${sessionId}/end`, { method: "PATCH" });
    await loadAll();
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
              placeholder={
                useLinkedEventTags
                  ? "Using linked event meeting URL"
                  : "Meeting URL"
              }
              required={!useLinkedEventTags}
              disabled={useLinkedEventTags}
              className="rounded border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <select
            value={form.eventId}
            onChange={(event) =>
              setForm({
                ...form,
                eventId: event.target.value,
                // Linked events should drive tags, so clear manual picks.
                tagIds: event.target.value ? [] : form.tagIds,
              })
            }
            className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No linked event</option>
            {eligibleEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          {eventsLoadError ? (
            <p className="mt-2 text-xs text-rose-700">{eventsLoadError}</p>
          ) : eligibleEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No eligible linked events yet. Only events you created with status
              &quot;SCHEDULED&quot; can be linked.
            </p>
          ) : null}
          <div
            className={`mt-3 flex flex-wrap gap-2 transition-opacity ${
              useLinkedEventTags ? "opacity-50" : "opacity-100"
            }`}
          >
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  if (useLinkedEventTags) return;
                  toggleTag(tag.id);
                }}
                disabled={useLinkedEventTags}
                className={`rounded border px-3 py-1 text-sm ${
                  form.tagIds.includes(tag.id)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700"
                } disabled:cursor-not-allowed`}
              >
                {tag.name}
              </button>
            ))}
          </div>
          {useLinkedEventTags ? (
            <p className="mt-2 text-xs text-slate-500">
              Tag and meeting URL inputs are disabled for linked events. Both come
              from the linked event.
            </p>
          ) : null}
          <button className="mt-4 rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Start Live Session
          </button>
          {formError ? <p className="mt-2 text-sm text-rose-700">{formError}</p> : null}
        </form>
      ) : null}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{session.topic}</p>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LIVE
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {session.professor.name ?? session.professor.email}
            </p>
            {currentUserId === session.professor.id ? (
              <p className="text-xs font-medium text-indigo-700">Your event</p>
            ) : null}
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
              {session.event ? (
                <Link href={`/events/${session.event.id}`} className="text-indigo-600">
                  Open room
                </Link>
              ) : null}
              {canManageLive && currentUserId === session.professor.id ? (
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
