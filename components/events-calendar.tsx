"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  professor: {
    id: string;
    name: string | null;
    email: string;
  };
  tags: { tag: { id: string; name: string; slug: string } }[];
};

type Tag = { id: string; name: string; slug: string };

type Props = {
  isProfessor: boolean;
};

export function EventsCalendar({ isProfessor }: Props) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    meetingUrl: "",
    tagIds: [] as string[],
  });

  async function load() {
    const [eventsResponse, tagsResponse] = await Promise.all([
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/tags", { cache: "no-store" }),
    ]);
    const eventsData = await eventsResponse.json();
    const tagsData = await tagsResponse.json();
    setEvents(eventsData.events ?? []);
    setTags((tagsData.tags ?? []).map((tag: Tag) => tag));
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function toggleTag(tagId: string) {
    setForm((previous) => ({
      ...previous,
      tagIds: previous.tagIds.includes(tagId)
        ? previous.tagIds.filter((id) => id !== tagId)
        : [...previous.tagIds, tagId],
    }));
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormMessage(null);

    const meetingUrl = /^https?:\/\//i.test(form.meetingUrl.trim())
      ? form.meetingUrl.trim()
      : `https://${form.meetingUrl.trim()}`;

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        meetingUrl,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      }),
    });

    if (response.ok) {
      setForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        meetingUrl: "",
        tagIds: [],
      });
      setFormMessage("Event created and saved.");
      await load();
    } else {
      const data = (await response.json().catch(() => null)) as
        | { error?: string | { formErrors?: string[] } }
        | null;
      setFormError(
        typeof data?.error === "string"
          ? data.error
          : "Could not create event. Check URL/time and role.",
      );
    }

    setSaving(false);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading events...</p>;

  return (
    <div className="space-y-6">
      {isProfessor ? (
        <form onSubmit={createEvent} className="rounded border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900">Create Event</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Title"
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="url"
              value={form.meetingUrl}
              onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
              placeholder="https://meet.google.com/..."
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => setForm({ ...form, endTime: event.target.value })}
              required
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description"
            className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
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
          <button
            disabled={saving}
            className="mt-4 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create"}
          </button>
          {formMessage ? (
            <p className="mt-2 text-sm text-emerald-700">{formMessage}</p>
          ) : null}
          {formError ? <p className="mt-2 text-sm text-rose-700">{formError}</p> : null}
        </form>
      ) : null}

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{event.title}</p>
                <p className="text-sm text-slate-600">
                  By {event.professor.name ?? event.professor.email}
                </p>
                <p className="text-sm text-slate-500">
                  {new Date(event.startTime).toLocaleString()} -{" "}
                  {new Date(event.endTime).toLocaleString()}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {event.status}
              </span>
            </div>
            {event.tags.length > 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Tags: {event.tags.map((tag) => tag.tag.name).join(", ")}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={`/events/${event.id}`} className="text-indigo-600">
                Open room
              </Link>
              <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="text-indigo-600">
                Join
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
