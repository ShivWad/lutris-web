import type { LutrisRecord } from "./types";

/** Preserve malformed nested details for inspection without discarding the game. */
export function parseNestedDetails(details: unknown): unknown {
  if (typeof details !== "string") return details ?? {};
  const value = details.trim();
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return details;
  }
}

/** Reject an ambiguous failed export; only an explicit empty array may clear the index. */
export function parseLutrisOutput(output: string): LutrisRecord[] {
  const trimmed = output.trim();
  if (!trimmed) throw new Error("Lutris returned no JSON. The existing library was kept.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Lutris returned invalid JSON. The existing library was kept.");
  }

  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { games?: unknown }).games)
      ? (parsed as { games: unknown[] }).games
      : undefined;

  if (!records || records.some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
    throw new Error("Expected a JSON array of game records or an object containing a games array. The existing library was kept.");
  }
  return records as LutrisRecord[];
}
