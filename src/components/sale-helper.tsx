"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { BadgeCheck, Search, ShoppingBag, Store, TriangleAlert } from "lucide-react";
import { baseGameTitle } from "@/lib/lutris/matching";
import type { LibraryGameGroup, LibraryPagePayload, LibraryQuery } from "@/lib/lutris/types";
import { CoverArt } from "./cover-art";
import { PageHeader } from "./page-header";
import { ServiceBadge } from "./service-badge";
import { usePaginatedLibrary } from "./use-paginated-library";

export function SaleHelper({ initialData, initialQuery = "" }: { initialData: LibraryPagePayload; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const criteria = useMemo<Omit<LibraryQuery, "page" | "pageSize">>(() => ({ query: deferredQuery, searchScope: "title", sort: "az" }), [deferredQuery]);
  const initialCriteria = useMemo<Omit<LibraryQuery, "page" | "pageSize">>(() => ({ query: initialQuery, searchScope: "title", sort: "az" }), [initialQuery]);
  const { data, loading, error } = usePaginatedLibrary(initialData, criteria, { pageSize: 12, initialCriteria });
  const groups = data.groups;
  const results = groups.slice(0, 12);
  const suggestions = useMemo(() => groups.filter((group) => group.games.length > 1 || group.edition).slice(0, 5), [groups]);
  const hasQuery = Boolean(deferredQuery.trim());

  return <div className="sub-page sale-page"><PageHeader title="Sale Check" subtitle="Check the shelf before you buy another copy." count={data.uniqueCount} lastRefreshed={data.lastRefreshed} />
    <section className="sale-console"><ShoppingBag size={22} /><label><span className="sr-only">Game name to check</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a game, edition, or DLC…" /></label><span className="sale-shortcut">Your local library only</span></section>
    {error && <div className="notice error">{error}</div>}
    {!hasQuery ? <section className="sale-intro"><div><Search size={25} /><h2>Try the title from a store page.</h2><p>Matching is edition-aware. Base games, definitive editions, remasters, and DLC stay visibly distinct.</p></div>{suggestions.length > 0 && <div className="suggestions"><span>Try one from your shelf</span>{suggestions.map((group) => <button key={group.key} onClick={() => setQuery(baseGameTitle(group.name))}>{baseGameTitle(group.name)}</button>)}</div>}</section> : loading ? <section className="ownership-verdict"><Search size={31} /><span><b>CHECKING</b><small>Searching the local title index…</small></span></section> : results.length > 0 ? <section className="sale-results"><div className="ownership-verdict owned"><BadgeCheck size={31} /><span><b>OWNED</b><small>{data.total} matching {data.total === 1 ? "edition" : "editions"} in your library</small></span></div><div className="sale-match-list">{results.map((group) => <SaleMatch key={group.key} group={group} />)}</div></section> : <section className="ownership-verdict unknown"><TriangleAlert size={31} /><span><b>NOT FOUND</b><small>No matching title in the current Lutris index. Check spelling or refresh the library.</small></span></section>}
    <aside className="sale-rule"><Store size={17} /><p><b>Conservative by design.</b> “Mafia II” and “Mafia II: Definitive Edition” appear separately. A search for “Mafia II” shows both so you can compare what you own.</p></aside>
  </div>;
}

function SaleMatch({ group }: { group: LibraryGameGroup }) {
  const services = [...new Set(group.games.map((game) => game.service))];
  return <article><div className="sale-cover"><CoverArt game={group.primary} /></div><div><span className="match-type">{group.isDlc ? "DLC / ADD-ON" : group.edition ?? "BASE GAME"}</span><h2>{group.name}</h2><div className="sale-stores">{services.map((service) => <span key={service}><ServiceBadge service={service} /><em>{group.edition ?? "Base game"}</em></span>)}</div></div><strong>{services.length === 1 ? "1 store" : `${services.length} stores`}</strong></article>;
}
