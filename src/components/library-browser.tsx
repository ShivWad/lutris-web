"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, DatabaseBackup, Disc3, FileJson, Grid2X2, List, Monitor, Search, SlidersHorizontal, Terminal, X } from "lucide-react";
import { CoverArt } from "./cover-art";
import { PageHeader } from "./page-header";
import { ServiceBadge, ServiceLogo } from "./service-badge";
import { usePaginatedLibrary } from "./use-paginated-library";
import type { GameService, LibraryGameGroup, LibraryPagePayload, LibraryRuntimeMode, LibrarySort } from "@/lib/lutris/types";
import { gameServices, serviceLabels as providerLabels, shortServiceLabels } from "@/lib/lutris/services";

type View = "grid" | "list";
type Sort = LibrarySort;
type InstallFilter = "all" | "installed" | "not-installed";
type PlaytimeFilter = "any" | "never" | "under2" | "2to10" | "10to50" | "50to100" | "over100";
type LinuxFilter = "all" | "native" | "windows" | "unknown";

const serviceLabels: Record<"all" | GameService, string> = { all: "All services", ...providerLabels };
const playtimeLabels: Record<PlaytimeFilter, string> = { any: "Any playtime", never: "Never played", under2: "Under 2 hours", "2to10": "2–10 hours", "10to50": "10–50 hours", "50to100": "50–100 hours", over100: "100+ hours" };

export function formatPlaytime(minutes?: number) {
  if (minutes === undefined) return "—";
  if (minutes === 0) return "Never played";
  return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)} h`;
}

function groupNumber(group: LibraryGameGroup, key: "playtimeMinutes" | "metacriticScore" | "openCriticScore" | "steamRatingPercent") {
  // Store copies represent one edition; summing playtime would double-count
  // provider totals. Keep missing metadata distinct from a real zero.
  const values = group.games.map((game) => game[key]).filter((value): value is number => typeof value === "number");
  return values.length ? Math.max(...values) : undefined;
}

function groupDate(group: LibraryGameGroup, key: "releaseDate" | "acquisitionDate" | "lastPlayed", latest = true) {
  const values = group.games.map((game) => game[key]).filter((value): value is string => Boolean(value)).sort();
  return values.length ? values[latest ? values.length - 1 : 0] : undefined;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="filter-select"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronDown size={14} /></label>;
}

export function LibraryBrowser({ initialData }: { initialData: LibraryPagePayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const serviceParam = searchParams.get("service");
  const service: "all" | GameService = serviceParam && Object.hasOwn(serviceLabels, serviceParam) ? serviceParam as GameService : "all";
  const [installation, setInstallation] = useState<InstallFilter>("all");
  const [playtime, setPlaytime] = useState<PlaytimeFilter>("any");
  const [linux, setLinux] = useState<LinuxFilter>("all");
  const [sort, setSort] = useState<Sort>("az");
  const [view, setView] = useState<View>("grid");
  const criteria = useMemo(() => ({ query: deferredQuery, service, installation, playtime, linux, sort }), [deferredQuery, service, installation, playtime, linux, sort]);
  const { data, loading, loadingMore, refreshing, rebuilding, error, refreshMessage, dismissRefreshMessage, refresh, rebuild, loadMore } = usePaginatedLibrary(initialData, criteria);
  const groups = data.groups;
  const counts = data.counts;
  const hasPlaytime = data.hasPlaytime;
  const [selected, setSelected] = useState<LibraryGameGroup | null>(initialData.groups[0] ?? null);
  const [autoSelected, setAutoSelected] = useState(true);
  const [rawOpen, setRawOpen] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);
  const loadMoreMarker = useRef<HTMLDivElement | null>(null);
  const rebuildDialog = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const current = groups.find((group) => group.key === selected.key);
    if (current && current !== selected) setSelected(current);
    if (!current) setSelected(groups[0] ?? null);
  }, [groups, selected]);

  useEffect(() => {
    const marker = loadMoreMarker.current;
    if (!marker || !data.hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "500px" });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [data.hasMore, loadMore]);

  const setService = (nextService: "all" | GameService) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextService === "all") params.delete("service");
    else params.set("service", nextService);
    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
  };
  const selectGame = (group: LibraryGameGroup) => { setAutoSelected(false); setSelected(group); };
  const closeDetails = useCallback(() => setSelected(null), []);
  const resetFilters = () => { setQuery(""); setService("all"); setInstallation("all"); setPlaytime("any"); setLinux("all"); };
  const activeFilters = Boolean(query || service !== "all" || installation !== "all" || playtime !== "any" || linux !== "all");
  const rebuildIndex = async () => {
    rebuildDialog.current?.close();
    setMaintenanceMessage(null);
    try {
      const entries = await rebuild();
      setMaintenanceMessage(`Local index rebuilt from ${entries.toLocaleString()} store entries.`);
    } catch {
      // The hook exposes the actionable server error in the shared notice.
    }
  };

  return (
    <div className="library-page">
      <PageHeader title="My Game Library" subtitle={`${data.entryCount.toLocaleString()} store entries, deduplicated by edition.`} lastRefreshed={data.lastRefreshed} refreshing={refreshing} refreshDisabled={rebuilding} onRefresh={refresh} actions={<button className="rebuild-button" onClick={() => rebuildDialog.current?.showModal()} disabled={refreshing || rebuilding} title="Rebuild the local index" aria-label={rebuilding ? "Rebuilding library index" : "Rebuild library index"}><DatabaseBackup size={15} />{rebuilding ? "Rebuilding…" : "Rebuild index"}</button>} />
      <section className="service-reel" aria-label="Library summary">
        {[{ key: "all" as const, label: "Unique editions" }, { key: "installed" as const, label: "Installed" }, ...gameServices.filter((store) => counts[store] > 0 || service === store).map((store) => ({ key: store, label: shortServiceLabels[store] }))].map(({ key, label }) => {
          const active = key === "installed" ? installation === "installed" : service === key && (key !== "all" || installation === "all");
          return <button key={key} className={active ? "active" : ""} aria-pressed={active} onClick={() => {
            if (key === "installed") setInstallation(installation === "installed" ? "all" : "installed");
            else { setService(key); if (key === "all") setInstallation("all"); }
          }}><span className="service-reel-label">{key !== "all" && key !== "installed" && <ServiceLogo service={key} />}{label}</span><b>{counts[key].toLocaleString()}</b></button>;
        })}
      </section>
      <section className="command-deck" aria-label="Search and filters">
        <label className="search-box"><Search size={18} /><span className="sr-only">Search library</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, studios, publishers…" />{query && <button className="clear-search" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</label>
        <div className="filters"><SlidersHorizontal size={17} aria-hidden="true" /><FilterSelect label="Service" value={service} onChange={(value) => setService(value as typeof service)}>{Object.entries(serviceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect><FilterSelect label="Installation" value={installation} onChange={(value) => setInstallation(value as InstallFilter)}><option value="all">Any installation</option><option value="installed">Installed</option><option value="not-installed">Not installed</option></FilterSelect>{hasPlaytime && <FilterSelect label="Playtime" value={playtime} onChange={(value) => setPlaytime(value as PlaytimeFilter)}>{Object.entries(playtimeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>}<FilterSelect label="Linux support" value={linux} onChange={(value) => setLinux(value as LinuxFilter)}><option value="all">Any Linux support</option><option value="native">Native Linux</option><option value="windows">Windows only</option><option value="unknown">Unknown</option></FilterSelect></div>
        <div className="sort-view"><FilterSelect label="Sort games" value={sort} onChange={(value) => setSort(value as Sort)}><option value="az">Title A–Z</option><option value="za">Title Z–A</option><option value="release-new">Release date: newest</option><option value="release-old">Release date: oldest</option><option value="acquired-new">Acquired: newest</option><option value="acquired-old">Acquired: oldest</option><option value="playtime">Most played</option><option value="last-played">Last played</option><option value="critic">Metacritic / OpenCritic</option><option value="steam-rating">Steam rating</option><option value="installed">Installed first</option><option value="service">Service</option></FilterSelect><div className="view-switch" role="group" aria-label="View"><button aria-label="Grid view" aria-pressed={view === "grid"} className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid2X2 size={17} /></button><button aria-label="List view" aria-pressed={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={18} /></button></div></div>
      </section>
      {(error || (data.warning && data.uniqueCount > 0)) && <div className={error ? "notice error" : "notice"} role={error ? "alert" : "status"}><span>{error ?? data.warning}</span>{error && <button onClick={refresh}>Try again</button>}</div>}
      {(maintenanceMessage || refreshMessage) && <div className="notice success" role="status"><span className="notice-copy"><Check size={16} />{maintenanceMessage ?? refreshMessage}</span><button onClick={() => { setMaintenanceMessage(null); dismissRefreshMessage(); }} aria-label="Dismiss message"><X size={16} /></button></div>}
      <div className={`library-workspace ${selected ? "with-details" : ""} ${autoSelected ? "auto-selected" : ""}`}><section className="catalog" aria-label="Games" aria-busy={loading}><div className="alpha-index" aria-hidden="true">{"#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => <span key={letter}>{letter}</span>)}</div><div className="catalog-heading"><span><b>{data.total.toLocaleString()}</b> unique editions found</span>{activeFilters && <button onClick={resetFilters}><X size={14} /> Clear filters</button>}</div>{loading ? <LibrarySkeleton /> : groups.length === 0 ? <EmptyLibrary hasFilters={activeFilters} runtimeMode={data.runtimeMode} refreshing={refreshing} onReset={resetFilters} onRefresh={refresh} /> : <>{view === "grid" ? <div className="game-grid">{groups.map((group, index) => <GameCard key={group.key} group={group} selected={selected?.key === group.key} onSelect={() => selectGame(group)} priority={index < 8} />)}</div> : <GameTable groups={groups} selectedKey={selected?.key} sort={sort} onSelect={selectGame} onSort={setSort} />}{data.hasMore && <div className="load-more" ref={loadMoreMarker}><button onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading more…" : `Load more (${groups.length.toLocaleString()} of ${data.total.toLocaleString()})`}</button></div>}</>}</section>{selected && <GameDetails group={selected} rawOpen={rawOpen} setRawOpen={setRawOpen} onClose={closeDetails} autoSelected={autoSelected} />}</div>
      <RebuildDialog dialogRef={rebuildDialog} rebuilding={rebuilding} onConfirm={rebuildIndex} />
    </div>
  );
}

function GameCard({ group, selected, onSelect, priority }: { group: LibraryGameGroup; selected: boolean; onSelect: () => void; priority: boolean }) {
  const playtime = groupNumber(group, "playtimeMinutes");
  return <button className={`game-card ${selected ? "selected" : ""}`} onClick={onSelect} aria-label={`View details for ${group.name}`} aria-pressed={selected}><div className="frame"><CoverArt game={group.primary} priority={priority} /><span className="accession">{String(group.primary.id).padStart(4, "0")}</span>{group.games.some((game) => game.installed) && <span className="installed-dot" title="Installed"><Check size={11} /></span>}{group.isDlc && <span className="content-badge">DLC</span>}</div><strong title={group.name}>{group.name}</strong>{group.edition && <span className="edition-line">{group.edition}</span>}<span className="card-meta"><span className="store-stack">{[...new Set(group.games.map((game) => game.service))].map((store) => <ServiceBadge key={store} service={store} />)}</span>{playtime !== undefined && <span>{formatPlaytime(playtime)}</span>}</span></button>;
}

function GameTable({ groups, selectedKey, sort, onSelect, onSort }: { groups: LibraryGameGroup[]; selectedKey?: string; sort: Sort; onSelect: (group: LibraryGameGroup) => void; onSort: (sort: Sort) => void }) {
  const columns: { label: string; ascending: Sort; descending?: Sort }[] = [
    { label: "Title", ascending: "az", descending: "za" }, { label: "Stores", ascending: "service" },
    { label: "Released", ascending: "release-old", descending: "release-new" }, { label: "Acquired", ascending: "acquired-old", descending: "acquired-new" },
    { label: "Playtime", ascending: "playtime-low", descending: "playtime" }, { label: "Last played", ascending: "last-played" },
    { label: "Critic", ascending: "critic" }, { label: "Steam", ascending: "steam-rating" },
  ];
  return <div className="table-wrap"><table><thead><tr>{columns.map(({ label, ascending, descending }) => {
    const active = sort === ascending || sort === descending;
    const direction = sort === ascending && (descending || ascending === "service") ? "ascending" : "descending";
    return <th key={label} scope="col" aria-sort={active ? direction : "none"}><button onClick={() => onSort(active && descending ? sort === descending ? ascending : descending : descending ?? ascending)}>{label}{active && <ChevronDown size={12} className={direction === "ascending" ? "sort-ascending" : ""} />}</button></th>;
  })}</tr></thead><tbody>{groups.map((group) => <tr key={group.key} className={selectedKey === group.key ? "selected" : ""} aria-selected={selectedKey === group.key} tabIndex={0} onClick={() => onSelect(group)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(group); } }}><td><span className="table-game"><span className="mini-cover"><CoverArt game={group.primary} /></span><span><b>{group.name}</b>{group.edition && <small>{group.edition}</small>}</span></span></td><td><span className="store-stack">{[...new Set(group.games.map((game) => game.service))].map((store) => <ServiceBadge key={store} service={store} />)}</span></td><td>{displayDate(groupDate(group, "releaseDate"))}</td><td>{displayDate(groupDate(group, "acquisitionDate"))}</td><td>{formatPlaytime(groupNumber(group, "playtimeMinutes"))}</td><td>{displayDate(groupDate(group, "lastPlayed"))}</td><td>{groupNumber(group, "openCriticScore") ?? groupNumber(group, "metacriticScore") ?? "—"}</td><td>{score(groupNumber(group, "steamRatingPercent"))}</td></tr>)}</tbody></table></div>;
}

function GameDetails({ group, rawOpen, setRawOpen, onClose, autoSelected }: { group: LibraryGameGroup; rawOpen: boolean; setRawOpen: (open: boolean) => void; onClose: () => void; autoSelected: boolean }) {
  const panel = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    // Desktop uses an inline ledger. Only an explicitly opened mobile ledger
    // traps focus and scrolling; the initial automatic selection stays inline.
    const syncModal = () => {
      const modal = media.matches && !autoSelected;
      document.body.style.overflow = modal ? "hidden" : previousOverflow;
      if (modal) {
        panel.current?.setAttribute("role", "dialog");
        panel.current?.setAttribute("aria-modal", "true");
        panel.current?.querySelector<HTMLButtonElement>(".close-details")?.focus();
      } else {
        panel.current?.removeAttribute("role");
        panel.current?.removeAttribute("aria-modal");
      }
    };
    syncModal();
    media.addEventListener("change", syncModal);
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("dialog[open]")) return;
      if (media.matches && autoSelected) return;
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab" || !media.matches) return;
      const controls = panel.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']");
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      media.removeEventListener("change", syncModal);
      if (media.matches && !autoSelected && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [autoSelected, onClose]);
  const game = group.primary;
  const supportedPlatforms = [...new Set(group.games.flatMap((entry) => entry.platforms ?? []))];
  const source = `${serviceLabels[game.service]} provider record via Lutris`;
  return (
    <aside ref={panel} className="details-panel" aria-labelledby="game-details-title">
      <button className="close-details" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      <div className="details-visual"><CoverArt game={game} /><span className="registration">CATALOG / {String(game.id).padStart(4, "0")}</span></div>
      <div className="details-body">
        <h2 id="game-details-title">{game.name}</h2>
        <div className="details-badges">
          {group.isDlc && <span className="status dlc"><Disc3 size={11} /> DLC</span>}
          {group.edition && <span className="duplicate-pill">{group.edition}</span>}
          {group.games.some((entry) => entry.installed) ? <span className="status installed">Installed</span> : <span className="status">Not installed</span>}
        </div>
        <section className="ownership-ledger">
          <h3>Ownership records</h3>
          {group.games.map((entry) => (
            <div key={`${entry.service}:${entry.id}`}>
              <ServiceBadge service={entry.service} />
              <span className="ownership-copy">
                <b>{entry.edition ?? "Base game"}</b>
                <small>Provider ID {entry.appId ?? String(entry.id)}{entry.acquisitionDate ? ` · Added ${displayDate(entry.acquisitionDate)}` : ""}</small>
              </span>
              <span className={`ownership-state ${entry.installed ? "installed" : ""}`}>{entry.installed ? "Installed" : "Library"}</span>
            </div>
          ))}
        </section>
        <dl>
          <Meta label="Developer" value={game.developer} />
          <Meta label="Publisher" value={game.publisher} />
          <Meta label="Released" value={displayDate(groupDate(group, "releaseDate"))} />
          <Meta label="Playtime" value={formatPlaytime(groupNumber(group, "playtimeMinutes"))} />
          <Meta label="Last played" value={displayDate(groupDate(group, "lastPlayed"))} />
          <Meta label="Platforms" value={supportedPlatforms.length ? supportedPlatforms.join(", ") : "Not supplied"} />
          <Meta label="Linux" value={group.games.some((entry) => entry.nativeLinuxSupport === true) ? "Native on at least one store" : group.games.some((entry) => entry.nativeLinuxSupport === false) ? "Windows only" : "Unknown"} />
          <Meta label="Critic score" value={score(groupNumber(group, "openCriticScore") ?? groupNumber(group, "metacriticScore"))} />
          <Meta label="Steam rating" value={score(groupNumber(group, "steamRatingPercent"))} />
          <Meta label="Metadata" value={source} />
        </dl>
        <div className="tags" aria-label="Genres">
          {game.genres?.length ? game.genres.map((genre) => <span key={genre}>{genre}</span>) : <span className="tag-unavailable">Genre unavailable</span>}
        </div>
        {game.description ? <p className="description">{game.description}</p> : <p className="description unavailable">Description unavailable from this provider.</p>}
        <button className="raw-toggle" onClick={() => setRawOpen(!rawOpen)} aria-expanded={rawOpen}>Advanced / Raw Metadata <ChevronDown size={15} className={rawOpen ? "open" : ""} /></button>
        {rawOpen && <pre>{JSON.stringify(group, null, 2)}</pre>}
      </div>
    </aside>
  );
}

function displayDate(value?: string) { if (!value) return "—"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed); }
function score(value?: number) { return value === undefined ? "—" : `${Math.round(value)}%`; }
function Meta({ label, value }: { label: string; value?: string }) { return <div><dt>{label}</dt><dd>{value ?? "—"}</dd></div>; }
function LibrarySkeleton() { return <div className="game-grid skeleton-grid">{Array.from({ length: 12 }, (_, index) => <div className="skeleton-card" key={index}><span /><i /></div>)}</div>; }
function EmptyLibrary({ hasFilters, runtimeMode, refreshing, onReset, onRefresh }: { hasFilters: boolean; runtimeMode: LibraryRuntimeMode; refreshing: boolean; onReset: () => void; onRefresh: () => void }) {
  if (hasFilters) return <div className="empty-state"><h2>No games match this cut.</h2><p>Clear active filters to widen the contact sheet.</p><button onClick={onReset}>Clear filters</button></div>;

  const isImport = runtimeMode === "import";
  const isDemo = runtimeMode === "demo";
  return (
    <div className="setup-state">
      <div className="setup-heading">
        <span className="setup-mark">{isImport ? <FileJson size={22} /> : isDemo ? <DatabaseBackup size={22} /> : <Monitor size={22} />}</span>
        <div><h2>{isImport ? "Connect your Docker library export" : isDemo ? "Load the demonstration library" : "Build your local Lutris index"}</h2><p>{isImport ? "Docker import mode detected. Export on the host; this container stays read-only." : isDemo ? "Demo mode detected. Load labeled sample records without touching Lutris." : "Local mode detected. Read connected services directly from Lutris on this computer."}</p></div>
      </div>
      <ol className="setup-steps">
        {isImport ? <>
          <li><span>1</span><div><b>Export from Lutris on the host</b><code>mkdir -p imports<br />lutris --list-all-service-games --json &gt; imports/library.json</code></div></li>
          <li><span>2</span><div><b>Refresh this index</b><p>After replacing the export, use refresh again—no container rebuild needed.</p></div></li>
        </> : isDemo ? <li><span>1</span><div><b>Load illustrative records</b><p>Sample entries are clearly labeled and stored only in memory.</p></div></li> : <>
          <li><span>1</span><div><b>Connect stores in Lutris</b><p>Sign in to your stores in Lutris and let each source load its games, then refresh this library.</p></div></li>
          <li><span>2</span><div><b>Read the local catalog</b><p>My Game Library runs predefined Lutris commands and creates a private SQLite index.</p></div></li>
        </>}
      </ol>
      <div className="setup-actions"><button onClick={onRefresh} disabled={refreshing}>{refreshing ? "Reading library…" : isDemo ? "Load demo library" : "Read library"}</button><span><Terminal size={15} /> Nothing is installed, launched, or changed.</span></div>
    </div>
  );
}

function RebuildDialog({ dialogRef, rebuilding, onConfirm }: { dialogRef: React.RefObject<HTMLDialogElement | null>; rebuilding: boolean; onConfirm: () => void }) {
  return (
    <dialog className="rebuild-dialog" ref={dialogRef} onCancel={() => dialogRef.current?.close()} aria-labelledby="rebuild-title">
      <form method="dialog">
        <span className="dialog-warning"><AlertTriangle size={20} /></span>
        <h2 id="rebuild-title">Rebuild local index?</h2>
        <p>Current source is read first. If that succeeds, the local SQLite index is recreated. Store libraries, installed games, and Lutris configuration stay untouched.</p>
        <div className="dialog-actions"><button value="cancel">Cancel</button><button type="button" className="confirm" onClick={onConfirm} disabled={rebuilding}>Rebuild index</button></div>
      </form>
    </dialog>
  );
}
