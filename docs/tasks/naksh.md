<!--
  WHAT: Naksh's task list, in priority order. Tick boxes off as you go.
  WITHOUT IT: It would be unclear what to work on next, and in what order.
-->

# Naksh: Backend, Auth & Permissions

You own the database schema, the API, and the security of Orbit: who is allowed to do what.

**Read first:** [`server/src/db/schema.ts`](../../server/src/db/schema.ts), [`server/src/routes/clubs.ts`](../../server/src/routes/clubs.ts), [`server/src/middleware.ts`](../../server/src/middleware.ts), [`docs/API.md`](../API.md)

**Useful docs:** [Drizzle](https://orm.drizzle.team/docs/overview) · [Express 5](https://expressjs.com/en/guide/routing.html) · [Better Auth](https://www.better-auth.com/docs) · [Zod](https://zod.dev)

## 1. The `event` table and `GET /api/events` (do this first, because Aryan and Rokyo need it)

- [ ] Add the `event` table to `schema.ts` using the design notes in that file, then run `npm run db:push`
- [ ] Add `eventListQuerySchema` and an `EventSummary` type to `shared/src/index.ts`
- [ ] Create `server/src/routes/events.ts` with `GET /api/events` and `GET /api/events/:id`, copying the pattern in `clubs.ts`
  - Only return upcoming, not-cancelled events, soonest first
  - Join with `club` so each event includes its club's name and slug
- [ ] Mount the router in `server/src/index.ts`
- [ ] Tell Aryan and Rokyo when it's merged

## 2. Restrict sign-up to `@uwo.ca`

- [ ] Follow the TODO in `server/src/auth.ts`
- [ ] Test it: signing up with a gmail address should fail, and a `@uwo.ca` address should work

## 3. Club creation and permissions (the core security work)

- [ ] `POST /api/clubs`: the creator becomes the owner, inside a transaction
- [ ] Write the `requireClubRole(...roles)` middleware (see the TODO in `middleware.ts`)
- [ ] `POST /api/clubs/:clubId/events`: only owners, admins, and editors
- [ ] Member management: add, change role, remove
- [ ] Transfer ownership
- [ ] Enforce **every** rule in the "Club permissions" section of `docs/API.md`

**Think like an attacker.** For each endpoint, ask: what happens if someone who isn't allowed calls it directly, without using our UI? Try it with curl or Postman. Can an editor promote themselves? Can someone edit another club's event by changing the `:clubId` in the URL?

## 4. Remaining tables

- [ ] `profile`, `club_follow`, `connection`: designs are in `schema.ts`
- [ ] The `TODO(advanced)` items: the one-owner-per-club index, the duplicate-connection index, and the event indexes. Research these or ask your AI assistant to _explain_ them, not just write them.

## 5. Stretch goals

- [ ] Image uploads (`server/src/s3.ts` TODO plus `POST /api/uploads`). Only allow image content types.
- [ ] Profile and connection endpoints

## Tips

- Run `npm run db:studio` to look at your data in the browser.
- Everyone builds on your schema, so post in the group chat whenever you change a table.
