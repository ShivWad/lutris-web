"use client";

import { useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";

const subscribe = () => () => {};

function IndexedTime({ value }: { value: string }) {
  // Server and browser locales/time zones may differ. Hydrate a deterministic
  // UTC label first, then format in the browser's locale after hydration.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(value);
  const label = hydrated
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : `${value.slice(0, 16).replace("T", " ")} UTC`;
  return <time dateTime={value} title={hydrated ? date.toLocaleString(undefined, { timeZoneName: "short" }) : value}><span className="index-dot" aria-hidden="true" />Indexed {label}</time>;
}

export function PageHeader({ title, count, subtitle, lastRefreshed, refreshing, refreshDisabled, onRefresh, actions }: { title: string; count?: number; subtitle: string; lastRefreshed?: string | null; refreshing?: boolean; refreshDisabled?: boolean; onRefresh?: () => void; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="header-meta">
        {lastRefreshed && <IndexedTime value={lastRefreshed} />}
        <div className="header-buttons">
          {typeof count === "number" && <span className="entry-count"><b>{count.toLocaleString()}</b> entries</span>}
          {actions}
          {onRefresh && <button className="refresh-button" onClick={onRefresh} disabled={refreshing || refreshDisabled} aria-label={refreshing ? "Refreshing library" : "Refresh library"} aria-busy={refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} /><span>{refreshing ? "Reading Lutris…" : "Refresh library"}</span></button>}
        </div>
      </div>
    </header>
  );
}
