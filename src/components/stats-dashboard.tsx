"use client";

import { useCallback, useState } from "react";
import { Copy, Gamepad2, HardDrive, Layers3, Timer, X } from "lucide-react";
import { formatPlaytime } from "./library-browser";
import { PageHeader } from "./page-header";
import { ServiceBadge } from "./service-badge";
import type { GameService, LibraryStatsPayload } from "@/lib/lutris/types";

export function StatsDashboard({ initialData }: { initialData: LibraryStatsPayload }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stats", { cache: "no-store" });
      if (!response.ok) throw new Error("Library statistics could not be loaded.");
      setData(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const response = await fetch("/api/library/refresh", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Lutris refresh failed.");
      await load();
      setRefreshMessage(`Library updated. ${Number(body.entries).toLocaleString()} store entries indexed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lutris refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  const stats = data.stats;
  const maxService = Math.max(...Object.values(stats.byService), 1);
  return <div className="sub-page"><PageHeader title="Library Statistics" count={stats.total} subtitle="The shape of your collection." lastRefreshed={data.lastRefreshed} refreshing={refreshing} onRefresh={refresh} />{error && <div className="notice error" role="alert">{error}</div>}{refreshMessage && <div className="notice success" role="status"><span>{refreshMessage}</span><button onClick={() => setRefreshMessage(null)} aria-label="Dismiss message"><X size={16} /></button></div>}
    <section className="ledger-totals" aria-label="Summary statistics" aria-busy={loading}>
      <Stat icon={Layers3} label="Unique games" value={stats.uniqueGames.toLocaleString()} note={`${stats.total} library entries`} />
      <Stat icon={HardDrive} label="Installed" value={stats.installed.toLocaleString()} note={`${stats.uninstalled} off disk`} />
      <Stat icon={Timer} label="Steam playtime" value={`${Math.round(stats.totalSteamPlaytimeMinutes / 60).toLocaleString()}h`} note={`${stats.withPlaytime} games recorded`} />
      <Stat icon={Copy} label="Duplicates" value={stats.duplicateGroups.length.toLocaleString()} note="Across services" />
    </section>
    <div className="stats-layout">
      <section className="platform-chart"><h2>Library by service</h2><p>Every entry, including duplicate ownership.</p><div className="bars">{Object.entries(stats.byService).filter(([, count]) => count > 0).map(([service, count]) => <div className="bar-row" key={service}><ServiceBadge service={service as GameService} /><span className="bar-track"><i style={{ width: `${Math.max(2, count / maxService * 100)}%` }} /></span><b>{count}</b></div>)}</div></section>
      <section className="top-played"><h2>Most played</h2><p>Recorded provider playtime.</p><ol>{stats.topPlayed.length ? stats.topPlayed.map((game) => <li key={`${game.service}:${game.id}`}><span><b>{game.name}</b><ServiceBadge service={game.service} /></span><strong>{formatPlaytime(game.playtimeMinutes)}</strong></li>) : <li className="no-data">No playtime metadata is available yet.</li>}</ol></section>
    </div>
    <section className="duplicate-ledger"><div><h2>Multi-store ownership</h2><p>Conservative exact-title groups. Definitive and remastered editions stay separate.</p></div>{stats.duplicateGroups.length ? <div className="duplicate-table">{stats.duplicateGroups.map((group) => <div key={group.title}><b>{group.games[0].name}</b><span>{group.games.map((game) => <ServiceBadge key={`${game.service}:${game.id}`} service={game.service} />)}</span><strong>Owned on {group.games.length}</strong></div>)}</div> : <p className="no-data">No cross-store duplicates found.</p>}</section>
  </div>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Gamepad2; label: string; value: string; note: string }) { return <div className="stat-line"><Icon size={18} /><span><small>{label}</small><b>{value}</b><em>{note}</em></span></div>; }
