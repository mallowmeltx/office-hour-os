"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bulkReading, setBulkReading] = useState(false);

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const data = await response.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  async function markRead(id: string) {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.readAt) return;

    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((previous) => Math.max(0, previous - 1));
    router.refresh();
  }

  async function markAllRead() {
    if (unreadCount === 0 || bulkReading) return;
    setBulkReading(true);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    const readAt = new Date().toISOString();
    setNotifications((previous) => previous.map((item) => ({ ...item, readAt })));
    setUnreadCount(0);
    setBulkReading(false);
    router.refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading notifications...</p>;
  if (notifications.length === 0) {
    return <p className="text-sm text-slate-500">No notifications yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600">
          Unread notifications:{" "}
          <span className="font-semibold text-slate-900">{unreadCount}</span>
        </p>
        <button
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || bulkReading}
          className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkReading ? "Marking..." : "Read all"}
        </button>
      </div>
      {notifications.map((item) => (
        <div
          key={item.id}
          className={`rounded border p-4 ${
            item.readAt
              ? "border-slate-200 bg-white"
              : "border-rose-200 bg-rose-50/40"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-slate-900">{item.title}</p>
            <span className="text-xs text-slate-500">
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          {item.event ? (
            <Link
              href={`/events/${item.event.id}`}
              className="mt-2 inline-flex rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
            >
              View event: {item.event.title}
            </Link>
          ) : null}
          {!item.readAt ? (
            <button
              onClick={() => markRead(item.id)}
              className="mt-2 inline-flex rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
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
