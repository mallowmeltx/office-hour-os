"use client";

import { useEffect, useState } from "react";

type Tag = {
  id: string;
  slug: string;
  name: string;
  isFollowing: boolean;
};

export function FollowTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/tags", { cache: "no-store" });
    const data = await response.json();
    setTags(data.tags ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  async function toggleFollow(tag: Tag) {
    const method = tag.isFollowing ? "DELETE" : "POST";
    await fetch(`/api/follows/tags/${tag.id}`, { method });
    setTags((previous) =>
      previous.map((row) =>
        row.id === tag.id ? { ...row, isFollowing: !row.isFollowing } : row,
      ),
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading tags...</p>;
  if (tags.length === 0) return <p className="text-sm text-slate-500">No tags yet.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tags.map((tag) => (
        <div key={tag.id} className="rounded border border-slate-200 p-4">
          <p className="font-medium text-slate-900">{tag.name}</p>
          <p className="text-sm text-slate-500">{tag.slug}</p>
          <button
            onClick={() => toggleFollow(tag)}
            className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            {tag.isFollowing ? "Unfollow" : "Follow"}
          </button>
        </div>
      ))}
    </div>
  );
}
