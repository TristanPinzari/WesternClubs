// WHAT: Fetch a page resource with cleanup, retry, and no stale response overwrites.
// WITHOUT IT: A slow response for the previous URL could populate a different club.
import { useEffect, useState } from "react";

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    load: typeof load;
    data: T | null;
    error: string | null;
    loading: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    // Same loader (a retry, e.g. after saving): keep showing the current data while
    // refetching, so forms and success messages stay on screen. A different loader
    // (new URL or user): start empty, so one club's data never shows on another's page.
    setState((prev) =>
      prev?.load === load
        ? { ...prev, error: null, loading: true }
        : { load, data: null, error: null, loading: true },
    );
    load()
      .then((data) => {
        if (!ignore) setState({ load, data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!ignore)
          setState((prev) => ({
            load,
            data: prev?.load === load ? prev.data : null,
            error: err instanceof Error ? err.message : "Request failed.",
            loading: false,
          }));
      });
    return () => {
      ignore = true;
    };
  }, [load, attempt]);
  // A URL or session change must hide the previous resource even before the effect runs.
  const current = state?.load === load ? state : null;
  const data = current?.data ?? null;
  const fetching = current?.loading ?? true;
  return {
    data,
    error: current?.error ?? null,
    // `loading` = nothing to show yet. `refreshing` = reloading data we already show.
    loading: fetching && data === null,
    refreshing: fetching && data !== null,
    retry: () => setAttempt((value) => value + 1),
  };
}
