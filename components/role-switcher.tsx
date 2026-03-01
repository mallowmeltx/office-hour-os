"use client";

import { useState } from "react";

type Props = {
  currentRole: "STUDENT" | "PROFESSOR";
};

export function RoleSwitcher({ currentRole }: Props) {
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveRole() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/me/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("Failed to update role.");
      return;
    }
    setMessage("Role updated.");
  }

  return (
    <div className="rounded border border-slate-200 p-4">
      <h3 className="font-medium text-slate-900">Role</h3>
      <p className="mt-1 text-sm text-slate-600">
        Switch between student and professor capabilities for demos.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as typeof role)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="STUDENT">STUDENT</option>
          <option value="PROFESSOR">PROFESSOR</option>
        </select>
        <button
          onClick={saveRole}
          disabled={saving}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Role"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
