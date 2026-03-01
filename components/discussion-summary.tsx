"use client";

import { useState } from "react";

type Props = {
  eventId: string;
};

type SummaryResponse = {
  summary?: string;
  error?: string;
  retryAfterMs?: number;
};

export function DiscussionSummary({ eventId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/discussions/${eventId}/summary`, {
        method: "POST",
      });
      const data = (await response.json()) as SummaryResponse;

      if (!response.ok) {
        if (response.status === 429 && typeof data.retryAfterMs === "number") {
          const seconds = Math.max(1, Math.ceil(data.retryAfterMs / 1000));
          setError(`Rate limit reached. Please retry in about ${seconds}s.`);
        } else {
          setError(data.error ?? "Could not generate summary.");
        }
        return;
      }

      setSummary(data.summary ?? "No summary available.");
    } catch {
      setError("Could not generate summary.");
    } finally {
      setLoading(false);
    }
  }

  function downloadSummary() {
    if (!summary) return;
    const content = `Office Hours OS - AI Discussion Summary\nEvent ID: ${eventId}\nGenerated At: ${new Date().toISOString()}\n\n${summary}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `event-${eventId}-ai-summary.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => void generate()}
        disabled={loading}
        className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Summarizing..." : summary ? "Regenerate Summary" : "Summarize with Gemini"}
      </button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {summary ? (
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Summary
            </p>
            <button
              onClick={() => downloadSummary()}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Download .txt
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-700">
            {summary}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
