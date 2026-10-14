"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryPagePayload, LibraryQuery } from "@/lib/lutris/types";

type Criteria = Omit<LibraryQuery, "page" | "pageSize">;

const defaultCriteria: Criteria = {
  query: "",
  service: "all",
  installation: "all",
  playtime: "any",
  linux: "all",
  sort: "az",
};

function criteriaKey(criteria: Criteria) {
  return JSON.stringify({ ...defaultCriteria, ...criteria });
}

function requestUrl(criteria: Criteria, page: number, pageSize: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  Object.entries(criteria).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  return `/api/library?${params}`;
}

/** Share catalog fetching across Library, Backlog, and Sale Check while rejecting stale responses. */
export function usePaginatedLibrary(initialData: LibraryPagePayload, criteria: Criteria, options: { pageSize?: number; initialCriteria?: Criteria } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const loadMoreInFlight = useRef(false);
  const key = useMemo(() => criteriaKey(criteria), [criteria]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const pageSize = options.pageSize ?? 48;
  // Requested and successfully loaded criteria differ while a request is pending.
  // Keep both so returning to the currently displayed filter can cancel a fetch.
  const loadedKey = useRef(criteriaKey(options.initialCriteria ?? defaultCriteria));

  const fetchPage = useCallback(async (page: number, replace: boolean) => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(requestUrl(JSON.parse(key) as Criteria, page, pageSize), { cache: "no-store", signal: nextController.signal });
      if (!response.ok) throw new Error("The library index could not be loaded.");
      const next = await response.json() as LibraryPagePayload;
      // Abort may race with response completion; the criteria identity is also
      // checked before a response may replace or append to the visible catalog.
      if (nextController.signal.aborted || currentKey.current !== key) return;
      setData((current) => replace ? next : { ...next, groups: [...current.groups, ...next.groups] });
      loadedKey.current = key;
      return true;
    } catch (cause) {
      if (nextController.signal.aborted || currentKey.current !== key) return;
      setError(cause instanceof Error ? cause.message : "The library index could not be loaded.");
    } finally {
      if (controller.current === nextController && !nextController.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [key, pageSize]);

  // A refresh may finish after filters change. Reload the latest criteria rather
  // than the filter captured when the refresh button was pressed.
  const latestFetchPage = useRef(fetchPage);
  latestFetchPage.current = fetchPage;

  useEffect(() => {
    if (key !== loadedKey.current) void fetchPage(1, true);
    else {
      // Returning to the loaded filter cancels the intervening request.
      setLoading(false);
      setLoadingMore(false);
    }
    return () => controller.current?.abort();
  }, [fetchPage, key]);

  const loadMore = useCallback(() => {
    // Observer callbacks can repeat before React commits loading state.
    if (key !== loadedKey.current || loading || loadingMore || loadMoreInFlight.current || !data.hasMore) return;
    loadMoreInFlight.current = true;
    void fetchPage(data.page + 1, false).finally(() => { loadMoreInFlight.current = false; });
  }, [data.hasMore, data.page, fetchPage, key, loading, loadingMore]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const response = await fetch("/api/library/refresh", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Lutris refresh failed.");
      if (await latestFetchPage.current(1, true)) {
        setRefreshMessage(`Library updated. ${Number(body.entries).toLocaleString()} store entries indexed.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lutris refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const rebuild = useCallback(async () => {
    setRebuilding(true);
    setError(null);
    setRefreshMessage(null);
    try {
      const response = await fetch("/api/library/rebuild", { method: "POST" });
      const body = await response.json() as { error?: string; entries?: number };
      if (!response.ok) throw new Error(body.error ?? "Library rebuild failed.");
      await latestFetchPage.current(1, true);
      return body.entries ?? 0;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Library rebuild failed.");
      throw cause;
    } finally {
      setRebuilding(false);
    }
  }, []);

  return { data, loading, loadingMore, refreshing, rebuilding, error, refreshMessage, dismissRefreshMessage: () => setRefreshMessage(null), refresh, rebuild, loadMore };
}
