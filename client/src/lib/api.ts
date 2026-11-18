// WHAT: Helper functions every page uses to call the backend API. `/api/...` works in
//   dev (Vite proxy) and prod (Vercel rewrite).
// WITHOUT IT: Every page would repeat its own fetch + error handling code, and each one
//   would handle failures slightly differently.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Exec forms also need JSON writes. Some successful mutations return 204, not JSON.
export async function apiWrite<T = void>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      error.error ??
        `Request failed (${res.status}). The endpoint may not be available yet.`,
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
