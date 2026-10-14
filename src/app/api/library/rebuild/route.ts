import { NextResponse } from "next/server";
import { rebuildLibrary } from "@/lib/lutris/client";
import { isSameOriginRequest } from "@/lib/lutris/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  try {
    const result = await rebuildLibrary();
    return NextResponse.json({ lastRefreshed: result.lastRefreshed, entries: result.games.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Library rebuild failed." }, { status: 503 });
  }
}
