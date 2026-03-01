"use client";

import { useEffect, useState } from "react";

type Professor = {
  id: string;
  name: string | null;
  email: string;
  isFollowing: boolean;
};

export function FollowProfessors() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/professors", { cache: "no-store" });
    const data = await response.json();
    setProfessors(data.professors ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  async function toggleFollow(professor: Professor) {
    const method = professor.isFollowing ? "DELETE" : "POST";
    await fetch(`/api/follows/professors/${professor.id}`, { method });
    setProfessors((previous) =>
      previous.map((row) =>
        row.id === professor.id ? { ...row, isFollowing: !row.isFollowing } : row,
      ),
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading professors...</p>;
  if (professors.length === 0) {
    return <p className="text-sm text-slate-500">No professors found yet.</p>;
  }

  return (
    <div className="space-y-3">
      {professors.map((professor) => (
        <div
          key={professor.id}
          className="flex items-center justify-between rounded border border-slate-200 p-4"
        >
          <div>
            <p className="font-medium text-slate-900">
              {professor.name ?? "Unnamed Professor"}
            </p>
            <p className="text-sm text-slate-600">{professor.email}</p>
          </div>
          <button
            onClick={() => toggleFollow(professor)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            {professor.isFollowing ? "Unfollow" : "Follow"}
          </button>
        </div>
      ))}
    </div>
  );
}
