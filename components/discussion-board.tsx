"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type PostNode = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { name: string | null; email: string };
  replies: PostNode[];
};

type Props = {
  eventId: string;
  currentUserId: string | null;
};

export function DiscussionBoard({ eventId, currentUserId }: Props) {
  const [tree, setTree] = useState<PostNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadContent, setThreadContent] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);

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

  async function submitThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/discussions/${eventId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: threadContent }),
    });
    if (response.ok) {
      setThreadContent("");
      await load();
    }
  }

  async function submitReply(parentId: string) {
    if (!replyContent.trim()) return;
    const response = await fetch(`/api/discussions/${eventId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, parentId }),
    });
    if (response.ok) {
      setReplyContent("");
      setReplyTargetId(null);
      await load();
    }
  }

  async function submitEdit(postId: string) {
    if (!editContent.trim()) return;
    const response = await fetch(`/api/discussions/${eventId}/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (response.ok) {
      setEditTargetId(null);
      setEditContent("");
      setMenuTargetId(null);
      await load();
    }
  }

  async function deletePost(postId: string) {
    const response = await fetch(`/api/discussions/${eventId}/posts/${postId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      if (editTargetId === postId) {
        setEditTargetId(null);
        setEditContent("");
      }
      if (menuTargetId === postId) {
        setMenuTargetId(null);
      }
      if (replyTargetId === postId) {
        setReplyTargetId(null);
        setReplyContent("");
      }
      await load();
    }
  }

  function renderNodes(nodes: PostNode[], nested = false) {
    if (nodes.length === 0) return null;

    return (
      <div
        className={
          nested
            ? "mt-3 space-y-3 border-l-2 border-slate-200 pl-4"
            : "space-y-4"
        }
      >
        {nodes.map((node) => (
          <div key={node.id} className="relative">
            {nested ? (
              <span className="absolute -left-4 top-3 h-px w-3 bg-slate-200" />
            ) : null}
            {(() => {
              const isOwner = currentUserId === node.authorId;
              const isDeleted =
                node.deletedAt !== null ||
                node.content.trim().toLowerCase() === "deleted";
              const isEdited =
                !isDeleted &&
                new Date(node.updatedAt).getTime() > new Date(node.createdAt).getTime();
              return (
            <div className="pl-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-slate-600">
              {node.author.name ?? node.author.email} •{" "}
              {new Date(node.createdAt).toLocaleString()}
              {isEdited ? <span className="ml-1 text-slate-500">(edited)</span> : null}
            </p>
            {isOwner && !isDeleted ? (
              <div className="relative">
                <button
                  onClick={() =>
                    setMenuTargetId((previous) =>
                      previous === node.id ? null : node.id,
                    )
                  }
                  className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Comment settings"
                  title="Comment settings"
                >
                  ⚙
                </button>
                {menuTargetId === node.id ? (
                  <div className="absolute right-0 z-10 mt-1 w-28 rounded border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      onClick={() => {
                        setEditTargetId(node.id);
                        setEditContent(node.content);
                        setMenuTargetId(null);
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setMenuTargetId(null);
                        void deletePost(node.id);
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <p
            className={`mt-1 text-sm ${
              isDeleted ? "italic text-rose-600" : "text-slate-900"
            }`}
          >
            {isDeleted ? "deleted" : node.content}
          </p>
          <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => {
              setReplyTargetId(node.id);
              setReplyContent("");
            }}
            className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Reply
          </button>
          </div>
          {editTargetId === node.id ? (
            <form
              className="mt-2 space-y-2 rounded border border-slate-200 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitEdit(node.id);
              }}
            >
              <textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                required
                placeholder="Edit your comment..."
              />
              <div className="flex items-center gap-2">
                <button className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTargetId(null);
                    setEditContent("");
                  }}
                  className="text-xs text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
          {replyTargetId === node.id ? (
            <form
              className="mt-2 space-y-2 rounded border border-slate-200 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitReply(node.id);
              }}
            >
              <textarea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                required
                placeholder="Write your reply..."
              />
              <div className="flex items-center gap-2">
                <button className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetId(null);
                    setReplyContent("");
                  }}
                  className="text-xs text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
              );
            })()}
            {node.replies.length > 0 ? renderNodes(node.replies, true) : null}
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Loading discussion...</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={submitThread} className="rounded border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900">Start a thread</h3>
        <textarea
          value={threadContent}
          onChange={(event) => setThreadContent(event.target.value)}
          className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          rows={4}
          required
          placeholder="Ask a question or share context..."
        />
        <div className="mt-3 flex items-center">
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Post
          </button>
        </div>
      </form>

      <div className="rounded border border-slate-200 bg-white p-4">{renderNodes(tree)}</div>
    </div>
  );
}
