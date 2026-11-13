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

// TODO: add apiPost / apiPatch / apiDelete the same way (method + JSON body + content-type header).
