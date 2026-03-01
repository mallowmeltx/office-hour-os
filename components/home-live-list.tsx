"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LiveSession = {
  id: string;
  topic: string;
  meetingUrl: string;
  professor: {
    name: string | null;
    email: string;
  };
  event: {
    id: string;
    title: string;
  } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

function parseMaybeJson(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function HomeLiveList() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/live", { cache: "no-store" });
      const text = await response.text();
      const data = parseMaybeJson(text);
      if (!response.ok) {
        setError((data.error as string) ?? "Failed to load live sessions.");
        setSessions([]);
        setLoading(false);
        return;
      }
      setError(null);
      setSessions(asArray<LiveSession>(data.sessions));
      setLoading(false);
    }

    const timeout = setTimeout(() => {
      void load();
    }, 0);
    const timer = setInterval(() => {
      void load();
    }, 10000);
    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading live sessions...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-slate-500">No professors are live right now.</p>;
  }

  return (
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
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-indigo-600"
          >
            Join Meeting
          </a>
          {session.event ? (
            <Link
              href={`/events/${session.event.id}`}
              className="mt-2 ml-3 inline-block text-sm font-medium text-indigo-600"
            >
              Open room
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
