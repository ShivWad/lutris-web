import { NextResponse } from "next/server";
import { getLibraryPage } from "@/lib/lutris/client";
import type { GameService, LibraryQuery, LibrarySort } from "@/lib/lutris/types";
import { gameServices } from "@/lib/lutris/services";

export const dynamic = "force-dynamic";

const services = new Set(["all", ...gameServices]);
const installations = new Set(["all", "installed", "not-installed"]);
const playtimes = new Set(["any", "never", "under2", "under2-inclusive", "2to10", "10to50", "50to100", "over100"]);
const linuxOptions = new Set(["all", "native", "windows", "unknown"]);
const sorts = new Set(["az", "za", "release-new", "release-old", "acquired-new", "acquired-old", "playtime", "playtime-low", "last-played", "critic", "steam-rating", "installed", "service"]);

function allowed<T extends string>(value: string | null, options: Set<string>, fallback: T) {
  return (value && options.has(value) ? value : fallback) as T;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query: LibraryQuery = {
    page: Number(params.get("page")) || 1,
    pageSize: Number(params.get("pageSize")) || 48,
    query: (params.get("query") ?? "").slice(0, 200),
    searchScope: params.get("searchScope") === "title" ? "title" : "all",
    service: allowed<"all" | GameService>(params.get("service"), services, "all"),
    installation: allowed<NonNullable<LibraryQuery["installation"]>>(params.get("installation"), installations, "all"),
    playtime: allowed<NonNullable<LibraryQuery["playtime"]>>(params.get("playtime"), playtimes, "any"),
    linux: allowed<NonNullable<LibraryQuery["linux"]>>(params.get("linux"), linuxOptions, "all"),
    sort: allowed<LibrarySort>(params.get("sort"), sorts, "az"),
  };
  return NextResponse.json(await getLibraryPage(query), { headers: { "Cache-Control": "private, no-store" } });
}
