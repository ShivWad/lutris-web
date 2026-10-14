"use client";

import { useState } from "react";

export default function LibraryError() {
  const [rebuilding, setRebuilding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function rebuild() {
    setRebuilding(true);
    setMessage(null);
    try {
      const response = await fetch("/api/library/rebuild", { method: "POST" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The index could not be rebuilt. Check the import source and try again.");
      // Refetch server-rendered data; resetting the client boundary alone would
      // replay the failed server component payload after a successful repair.
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The server could not be reached. Try again.");
    } finally {
      setRebuilding(false);
    }
  }

  return <section className="empty-state" role="alert">
    <h1>The library could not be loaded.</h1>
    <p>Try again. If the local index is damaged, rebuild it from your configured Lutris source. Your games and source export stay untouched.</p>
    {message && <p>{message}</p>}
    <div className="empty-actions">
      <button onClick={() => window.location.reload()} disabled={rebuilding}>Try again</button>
      <button onClick={rebuild} disabled={rebuilding}>{rebuilding ? "Rebuilding…" : "Rebuild local index"}</button>
    </div>
  </section>;
}
