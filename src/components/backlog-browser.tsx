"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, X } from "lucide-react";
import { CoverArt } from "./cover-art";
import { formatPlaytime } from "./library-browser";
import { PageHeader } from "./page-header";
import { ServiceBadge } from "./service-badge";
import { usePaginatedLibrary } from "./use-paginated-library";
import type { LibraryPagePayload, LibraryQuery } from "@/lib/lutris/types";

type BacklogFilter = "all" | "never" | "under2" | "installed" | "not-installed";

const initialCriteria: Omit<LibraryQuery, "page" | "pageSize"> = { installation: "not-installed", sort: "playtime-low" };

export function BacklogBrowser({ initialData }: { initialData: LibraryPagePayload }) {
  const [filter, setFilter] = useState<BacklogFilter>("not-installed");
  // Backlog deliberately includes unknown playtime in its "under two" bucket;
  // the main library's under2 filter requires a known positive duration.
  const criteria = useMemo<Omit<LibraryQuery, "page" | "pageSize">>(() => ({
    installation: filter === "installed" ? "installed" : filter === "not-installed" ? "not-installed" : "all",
    playtime: filter === "never" ? "never" : filter === "under2" ? "under2-inclusive" : "any",
    sort: "playtime-low",
  }), [filter]);
  const { data, loading, loadingMore, refreshing, error, refreshMessage, dismissRefreshMessage, refresh, loadMore } = usePaginatedLibrary(initialData, criteria, { initialCriteria });
  const marker = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!marker.current || !data.hasMore) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { rootMargin: "500px" });
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, [data.hasMore, loadMore]);

  const games = data.groups;
  return <div className="sub-page"><PageHeader title="Backlog" count={data.total} subtitle="Owned, waiting, and ready for a second look." lastRefreshed={data.lastRefreshed} refreshing={refreshing} onRefresh={refresh} />
    <section className="backlog-controls" aria-label="Backlog filters">{([['not-installed','Not installed'],['never','Never played'],['under2','Under 2 hours'],['installed','Installed'],['all','Everything']] as [BacklogFilter,string][]).map(([value,label]) => <button key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</section>
    {error && <div className="notice error" role="alert">{error}</div>}{refreshMessage && <div className="notice success" role="status"><span>{refreshMessage}</span><button onClick={dismissRefreshMessage} aria-label="Dismiss message"><X size={16} /></button></div>}
    {loading ? <div className="stats-loading" /> : games.length ? <><section className="backlog-stack">{games.map((group, index) => { const minutes = Math.max(0, ...group.games.map((game) => game.playtimeMinutes ?? 0)); const installed = group.games.some((game) => game.installed); return <article key={group.key}><span className="backlog-index">{String(index + 1).padStart(2,"0")}</span><div className="backlog-cover"><CoverArt game={group.primary} /></div><div className="backlog-title"><h2>{group.name}</h2><span><span className="store-stack">{[...new Set(group.games.map((game) => game.service))].map((store) => <ServiceBadge key={store} service={store} />)}</span>{group.edition && <small>{group.edition}</small>}</span></div><div className="backlog-time"><Clock3 size={15} /><span><b>{formatPlaytime(minutes)}</b><small>{installed ? "On disk" : "Not installed"}</small></span></div></article>; })}</section>{data.hasMore && <div className="load-more" ref={marker}><button onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading more…" : `Load more (${games.length.toLocaleString()} of ${data.total.toLocaleString()})`}</button></div>}</> : <div className="empty-state"><span>ZERO QUEUE</span><h2>Nothing matches this backlog cut.</h2><p>Try another status or refresh your library index.</p></div>}
  </div>;
}
