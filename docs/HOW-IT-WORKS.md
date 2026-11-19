<!--
  WHAT: A beginner's guide to how the app's pieces fit together, following one real request
    from a click in the browser to the database and back, plus a glossary of terms.
  WITHOUT IT: New teammates would have to piece the architecture together by reading
    every file, and terms like "middleware" or "ORM" would go unexplained.
-->

# How WesternClubs Works

This guide follows **one real request** through the whole app: searching on the Clubs page. Every feature you build works the same way, so once you understand this flow you understand the project.

Open the files as you read. Each step links to the code.

## The big picture

```
 ┌─────────────── Browser ───────────────┐
 │  React page (ClubsPage.tsx)           │
 │      │  apiGet("/clubs?q=ai")         │
 │      ▼                                │
 │  fetch("/api/clubs?q=ai") ────────────┼──┐
 └───────────────────────────────────────┘  │
                                            ▼
                     Vite dev server (localhost:5173)
                     forwards anything starting with /api
                     (in production, Vercel does this instead)
                                            │
                                            ▼
 ┌──────────── Express server (localhost:3000) ────────────┐
 │  index.ts       → runs middleware, picks the router     │
 │  middleware.ts  → who is signed in? (req.user)          │
 │  routes/clubs.ts → validate input → query the database  │
 └──────────────────────────┬──────────────────────────────┘
                            │ SQL (written for us by Drizzle)
                            ▼
                   Neon (PostgreSQL database)
```

The answer travels back up the same path as JSON, and React re-renders the page with it.

## Step by step

### 1. The page asks for data

**[`client/src/pages/ClubsPage.tsx`](../client/src/pages/ClubsPage.tsx)**

When you type in the search box, `setSearch` updates the `search` state. Because `search` is listed in the `useEffect` dependencies (`[search]`), React re-runs the effect, which calls:

```ts
apiGet<Paginated<ClubSummary>>(`/clubs?q=ai`);
```

### 2. The helper sends the HTTP request

**[`client/src/lib/api.ts`](../client/src/lib/api.ts)**

`apiGet` calls `fetch("/api/clubs?q=ai")`. The URL has no domain, so the browser sends it to whatever site it's on, which is `localhost:5173`, the Vite dev server.

### 3. Vite forwards it to the backend

**[`client/vite.config.ts`](../client/vite.config.ts)**

Vite serves the React app, but it doesn't know anything about clubs. The `proxy` setting tells it to forward anything starting with `/api` to Express on `localhost:3000`.

In production the same thing happens, except Vercel does the forwarding ([`client/vercel.json`](../client/vercel.json)) and Express runs on Railway. Because the browser only ever talks to one address, login cookies just work.

### 4. Express receives the request

**[`server/src/index.ts`](../server/src/index.ts)**

Express runs the request through each `app.use(...)` / `app.all(...)` **in order, top to bottom**:

1. `/api/auth/*`: not a match (our URL is `/api/clubs`), so skip
2. `express.json()`: would parse a JSON body (a GET has none)
3. `loadSession`: see step 5
4. `/api/clubs` → match! Hand the request to `clubsRouter`

### 5. Middleware works out who's asking

**[`server/src/middleware.ts`](../server/src/middleware.ts)**

`loadSession` reads the login cookie the browser sent automatically, asks Better Auth which user it belongs to, and stores that user on `req.user` (or `undefined` if signed out). Every route after it can check `req.user`.

Listing clubs is public, so this route doesn't care. A protected route adds `requireAuth`, which responds `401 Not signed in` when `req.user` is missing.

### 6. The route validates input and queries the database

**[`server/src/routes/clubs.ts`](../server/src/routes/clubs.ts)**

```ts
const query = clubListQuerySchema.parse(req.query); // 1. validate
const rows = await db.select().from(club).where(...); // 2. query
res.json({ items: rows.map(toClubSummary), total }); // 3. respond
```

1. **Validate.** `req.query` is `{ q: "ai" }`, straight from the URL. **Never trust it.** Anyone can send anything. The Zod schema (from [`shared/src/index.ts`](../shared/src/index.ts)) checks it and fills in defaults (`limit: 20`). If it's invalid, Zod throws, and `errorHandler` (in `middleware.ts`) responds `400` with the details.
2. **Query.** Drizzle turns this TypeScript into SQL (`SELECT ... FROM club WHERE name ILIKE '%ai%'`) and sends it to Neon through the connection in [`server/src/db/index.ts`](../server/src/db/index.ts). The `club` table comes from [`server/src/db/schema.ts`](../server/src/db/schema.ts).
3. **Respond.** Convert database rows into the shared `ClubSummary` shape and send them as JSON.

### 7. The answer goes back to the page

The JSON travels back through Vite to `apiGet`, which returns it. Back in `ClubsPage`, `setClubs(data.items)` updates state, and React re-renders the list.

If anything failed, `apiGet` throws, `setError(...)` stores the message, and the page shows it in red.

## How sign-in fits in

1. The sign-in page calls `authClient.signIn.email({ email, password })` ([`client/src/lib/auth-client.ts`](../client/src/lib/auth-client.ts)).
2. That sends `POST /api/auth/sign-in/email`, which Express hands to Better Auth (the `/api/auth/*` line in `index.ts`, configured in [`server/src/auth.ts`](../server/src/auth.ts)).
3. Better Auth checks the password, creates a row in the `session` table, and sends back a **cookie**.
4. From then on, the browser attaches that cookie to **every** `/api` request automatically, which is how `loadSession` knows who you are in step 5.

## Where do I add...?

| I want to add...    | Where                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A database table    | `server/src/db/schema.ts`, then `npm run db:push`                                                                                                       |
| An API endpoint     | A router in `server/src/routes/` (copy `clubs.ts`), mounted in `server/src/index.ts`. Put its Zod schema in `shared/src/index.ts`. Update `docs/API.md` |
| A page              | `client/src/pages/` (copy `ClubsPage.tsx`), plus a `<Route>` in `client/src/App.tsx`                                                                    |
| A reusable UI piece | `client/src/components/` (e.g. `EventCard.tsx`)                                                                                                         |
| A type used by both | `shared/src/index.ts`                                                                                                                                   |
| Demo data           | `server/src/db/seed.ts`, then `npm run db:seed`                                                                                                         |

## Debugging: where to look

When something doesn't work, follow the request and find where it breaks:

1. **Browser DevTools → Console:** frontend errors (React crashes, typos).
2. **Browser DevTools → Network tab:** click the `/api/...` request. What status code came back? What's in the response? This tells you whether the problem is frontend or backend.
3. **The terminal running `npm run dev`:** backend errors and stack traces.
4. **`npm run db:studio`:** what's actually in the database.

## Glossary

| Term                       | Meaning                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend / client**      | The code that runs in the browser (`client/`). What users see.                                                                                    |
| **Backend / server**       | The code that runs on a server (`server/`). Talks to the database and enforces the rules.                                                         |
| **API**                    | The set of URLs the backend responds to. The frontend's only way to get or change data.                                                           |
| **Endpoint / route**       | One URL + method the API handles, e.g. `GET /api/clubs`.                                                                                          |
| **Router**                 | A group of related routes, e.g. everything under `/api/clubs` lives in `routes/clubs.ts`.                                                         |
| **HTTP methods**           | `GET` reads, `POST` creates, `PUT`/`PATCH` updates, `DELETE` deletes.                                                                             |
| **Status code**            | The number in a response: `200` OK, `400` bad input, `401` not signed in, `403` not allowed, `404` not found, `500` server bug.                   |
| **JSON**                   | The text format data travels in: `{ "name": "Western AI" }`.                                                                                      |
| **Query params**           | Options after `?` in a URL: `/api/clubs?q=ai&limit=5`. Read with `req.query`.                                                                     |
| **Path params**            | Variable parts of the path: `/api/clubs/:slug` matches `/api/clubs/western-ai`. Read with `req.params`.                                           |
| **Request body**           | Data sent with `POST`/`PUT`/`PATCH`, usually JSON. Read with `req.body`.                                                                          |
| **Middleware**             | A function that runs before route handlers, e.g. checking who's signed in. Can let the request continue (`next()`) or stop it with a response.    |
| **Validation**             | Checking input is the right shape before using it. We use **Zod**.                                                                                |
| **Database / table / row** | Postgres stores data in tables (like spreadsheets). Each row is one item, e.g. one club.                                                          |
| **Schema**                 | The definition of every table and column (`schema.ts`).                                                                                           |
| **ORM**                    | A library that lets you query the database in TypeScript instead of raw SQL. We use **Drizzle**.                                                  |
| **Primary key**            | The column (or columns) that uniquely identifies a row, like `id`.                                                                                |
| **Foreign key**            | A column pointing at another table's row, e.g. `club_member.club_id` → `club.id`.                                                                 |
| **Session / cookie**       | After signing in, the browser stores a cookie and sends it with every request. The server looks it up in the `session` table to know who you are. |
| **Environment variables**  | Settings and secrets kept outside the code, in `server/.env`. Never committed.                                                                    |
| **Proxy**                  | Something that forwards requests elsewhere. Vite (dev) and Vercel (prod) forward `/api` to Express.                                               |
| **Component**              | A reusable piece of UI, written as a function returning JSX, e.g. `ClubsPage`.                                                                    |
| **JSX**                    | The HTML-like syntax inside React components: `<h1>Clubs</h1>`.                                                                                   |
| **State (`useState`)**     | Data a component remembers. Changing it makes React re-render.                                                                                    |
| **Effect (`useEffect`)**   | Code that runs after rendering, e.g. fetching data. Re-runs when its dependencies change.                                                         |
| **Props**                  | Inputs passed into a component, like function arguments: `<EventCard event={e} />`.                                                               |
| **Monorepo / workspace**   | One repo holding several packages (`client`, `server`, `shared`) that npm installs and links together.                                            |
| **Type (TypeScript)**      | A description of a value's shape, e.g. `ClubSummary`. TypeScript catches mismatches before the code runs.                                         |
