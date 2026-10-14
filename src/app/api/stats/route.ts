import { NextResponse } from "next/server";
import { getLibraryStats } from "@/lib/lutris/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getLibraryStats(), { headers: { "Cache-Control": "private, no-store" } });
}
