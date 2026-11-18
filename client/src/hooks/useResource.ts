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
    setState({ load, data: null, error: null, loading: true });
    load()
      .then((data) => {
        if (!ignore) setState({ load, data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!ignore)
          setState({
            load,
            data: null,
            error: err instanceof Error ? err.message : "Request failed.",
            loading: false,
          });
      });
    return () => {
      ignore = true;
    };
  }, [load, attempt]);
  // A URL or session change must hide the previous resource even before the effect runs.
  const current = state?.load === load ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current?.loading ?? true,
    retry: () => setAttempt((value) => value + 1),
  };
}
