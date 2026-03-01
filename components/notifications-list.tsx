"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  event: { id: string; title: string } | null;
};

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const data = await response.json();
    setNotifications(data.notifications ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading notifications...</p>;
  if (notifications.length === 0) {
    return <p className="text-sm text-slate-500">No notifications yet.</p>;
  }

  return (
    <div className="space-y-3">
      {notifications.map((item) => (
        <div key={item.id} className="rounded border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-slate-900">{item.title}</p>
            <span className="text-xs text-slate-500">
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          {item.event ? (
            <a href={`/events/${item.event.id}`} className="mt-2 inline-block text-sm text-indigo-600">
              View event: {item.event.title}
            </a>
          ) : null}
          {!item.readAt ? (
            <button
              onClick={() => markRead(item.id)}
              className="mt-2 block text-sm text-slate-700"
            >
              Mark read
            </button>
          ) : (
            <p className="mt-2 text-xs text-emerald-600">Read</p>
          )}
        </div>
      ))}
    </div>
  );
}
