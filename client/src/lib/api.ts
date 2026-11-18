// WHAT: Helper functions every page uses to call the backend API. `/api/...` works in
//   dev (Vite proxy) and prod (Vercel rewrite).
// WITHOUT IT: Every page would repeat its own fetch + error handling code, and each one
//   would handle failures slightly differently.

// Shared by every helper: send the request, turn an error response into a thrown Error
// with the server's message, and parse the JSON body (if there is one).
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  // 204 No Content (e.g. after a DELETE) has no body to parse.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => request<T>(path);

// All writes (POST/PUT/PATCH/DELETE) go through this. Some return 204, not JSON. Some successful mutations return 204, not JSON.
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
