"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./client";

/**
 * Subscribe to postgres changes on the given tables and call `onChange`
 * whenever any of them changes. RLS limits events to the user's family.
 */
export function useRealtime(tables: string[], onChange: () => void) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });

  const key = tables.join(",");
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`rt-${key}-${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => cb.current());
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [key]);
}

/**
 * Run `fetcher` on mount (and whenever it changes), and again whenever any of
 * `tables` changes. `fetcher` must be memoized with useCallback.
 */
export function useLiveQuery<T>(fetcher: () => Promise<T>, tables: string[]) {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetcher().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [fetcher]);

  const reload = useCallback(() => fetcher().then(setData), [fetcher]);
  useRealtime(tables, reload);

  return { data, loading: data === undefined, reload };
}
