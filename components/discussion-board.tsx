"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type PostNode = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string | null; email: string };
  replies: PostNode[];
};

type Props = {
  eventId: string;
};

export function DiscussionBoard({ eventId }: Props) {
  const [tree, setTree] = useState<PostNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/discussions/${eventId}/posts`, {
      cache: "no-store",
    });
    const data = await response.json();
    setTree(data.tree ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
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
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/discussions/${eventId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: replyTarget ?? undefined }),
    });
    if (response.ok) {
      setContent("");
      setReplyTarget(null);
      await load();
    }
  }

  function renderNodes(nodes: PostNode[], depth = 0) {
    return nodes.map((node) => (
      <div
        key={node.id}
        className="mt-3 rounded border border-slate-200 p-3"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <p className="text-sm text-slate-900">{node.content}</p>
        <p className="mt-1 text-xs text-slate-500">
          {node.author.name ?? node.author.email} -{" "}
          {new Date(node.createdAt).toLocaleString()}
        </p>
        <button
          onClick={() => setReplyTarget(node.id)}
          className="mt-2 text-xs text-indigo-600"
        >
          Reply
        </button>
        {node.replies.length > 0 ? renderNodes(node.replies, depth + 1) : null}
      </div>
    ));
  }

  if (loading) return <p className="text-sm text-slate-500">Loading discussion...</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900">
          {replyTarget ? "Reply to thread" : "Start a thread"}
        </h3>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          rows={4}
          required
          placeholder="Ask a question or share context..."
        />
        <div className="mt-3 flex items-center gap-3">
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Post
          </button>
          {replyTarget ? (
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-sm text-slate-600"
            >
              Cancel reply
            </button>
          ) : null}
        </div>
      </form>

      <a
        href={`/api/discussions/${eventId}/export`}
        className="inline-block rounded border border-slate-300 px-3 py-2 text-sm"
      >
        Export Discussion (.txt)
      </a>

      <div>{renderNodes(tree)}</div>
    </div>
  );
}
