<!--
  WHAT: The API contract: every endpoint, who can call it, and whether it's built yet.
    Frontend and backend both work from this, so they can build in parallel.
  WITHOUT IT: Frontend and backend would guess at each other's URLs and data shapes, and
    the permission rules would live only in people's heads.
-->

# Orbit API

All routes live under `/api`. Request and response bodies are JSON.
Request validation schemas and response types go in `shared/src/index.ts`.

**Auth:** "Public" means anyone. "Signed in" means use the `requireAuth` middleware. Club roles mean use `requireClubRole` (see the permissions table).

**Status:** ✅ done · ⬜ to do

## Auth (handled by Better Auth, nothing to build)

| Method | Path                      | Notes                                                                                                     |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email` | `{ name, email, password }`. Non-`@uwo.ca` emails get 400 with `{ message }` (`isAllowedEmail` in shared) |
| POST   | `/api/auth/sign-in/email` | `{ email, password }`                                                                                     |
| POST   | `/api/auth/sign-out`      |                                                                                                           |
| GET    | `/api/auth/get-session`   | Current user, or `null`                                                                                   |

On the frontend, use `authClient` in `client/src/lib/auth-client.ts` rather than calling these directly.

## Clubs

| Status | Method       | Path                                    | Who                       | Notes                                                                                                                               |
| ------ | ------------ | --------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET          | `/api/clubs?q=&limit=&offset=`          | Public                    | Search and list clubs                                                                                                               |
| ✅     | GET          | `/api/clubs/:slug`                      | Public                    | Club details (`ClubDetail`: includes `links`, and `isFollowing` for the signed-in user)                                             |
| ✅     | POST         | `/api/clubs`                            | Signed in                 | `{ name, description? }`. Creator becomes **owner**. Taken slug gets `-2`, `-3`                                                     |
| ✅     | PATCH        | `/api/clubs/:clubId`                    | Owner, Admin              | `updateClubSchema`: name, description, `logoKey` (from an upload to `clubs`), `links`. Never changes the slug. Returns `ClubDetail` |
| ✅     | DELETE       | `/api/clubs/:clubId`                    | Owner                     | 204. Permanent: also deletes its members and events                                                                                 |
| ✅     | GET          | `/api/clubs/:clubId/members`            | Public                    | `ClubMember[]`: userId, name, picture, role (never email). Owner first                                                              |
| ✅     | POST         | `/api/clubs/:clubId/members`            | Owner, Admin              | `{ email, role }`. Admins can only add editors. 404 if no account, 409 if already an exec                                           |
| ✅     | PATCH        | `/api/clubs/:clubId/members/:userId`    | Owner, Admin              | `{ role }`. Owner only, except an admin can demote themselves. See rules below                                                      |
| ✅     | DELETE       | `/api/clubs/:clubId/members/:userId`    | Owner, Admin, or yourself | Remove an exec, or leave the club. Admins can only remove editors. 204                                                              |
| ✅     | POST         | `/api/clubs/:clubId/transfer-ownership` | Owner                     | `{ userId }`. Must already be an exec. Old owner becomes admin. Returns `ClubMember[]`                                              |
| ✅     | PUT / DELETE | `/api/clubs/:clubId/follow`             | Signed in                 | Follow or unfollow. 204, safe to repeat                                                                                             |

### Club permissions

| Action                         | Owner | Admin | Editor |
| ------------------------------ | :---: | :---: | :----: |
| Create, edit, or cancel events |  ✅   |  ✅   |   ✅   |
| Edit club details              |  ✅   |  ✅   |        |
| Add or remove editors          |  ✅   |  ✅   |        |
| Add, remove, or demote admins  |  ✅   |       |        |
| Transfer ownership             |  ✅   |       |        |
| Delete club                    |  ✅   |       |        |

Rules worth enforcing:

- Nobody can remove or demote the owner. The owner must transfer ownership first.
- You can't set `role: "owner"` through the members endpoints. Only transfer-ownership does that.
- The owner can't leave the club without transferring ownership first.
- Only the owner can add, promote, demote, or remove admins. An admin can demote **themselves** to editor.
- A club has at most one owner, enforced by the database too (the `club_member_one_owner` index).

### Club URLs (slugs)

- The slug is created from the name when the club is created. If it's taken, add a number: `western-ai`, `western-ai-2`, `western-ai-3`.
- A name with no Latin letters or numbers ("한국 학생회") gets a random slug like `club-3fa9c2`. A name with no letters or numbers at all ("!!!") is a 400.
- **Renaming a club (`PATCH`) changes only `name`. The slug stays the same**, so links people have shared (Instagram bios, posters, group chats) keep working.
- Letting owners change the slug themselves is a possible future feature, not part of the hackathon.

## Events

| Status | Method | Path                                                    | Who                              | Notes                                                                                                                                      |
| ------ | ------ | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅     | GET    | `/api/events?q=&category=&clubId=&from=&limit=&offset=` | Public                           | Upcoming, not-cancelled events, soonest first. `q` searches title, description, and club name                                              |
| ✅     | GET    | `/api/events/:id`                                       | Public                           | Includes club info. Also returns past/cancelled events (check `cancelledAt`). Going/interested counts come from `GET /api/events/:id/rsvp` |
| ✅     | POST   | `/api/clubs/:clubId/events`                             | Owner, Admin, Editor             | `createEventSchema`. Title, category, startsAt required. Must start in the future. Returns 201 with `EventDetail`                          |
| ✅     | PATCH  | `/api/events/:id`                                       | That club's Owner, Admin, Editor | `updateEventSchema`: send only changed fields (`null` clears). Can't move clubs. 409 if cancelled. Returns `EventDetail`                   |
| ✅     | POST   | `/api/events/:id/cancel`                                | That club's Owner, Admin, Editor | Sets `cancelledAt`. Permanent; cancelling twice keeps the first time. Returns `EventDetail`                                                |

For `PATCH /api/events/:id` and `POST /api/events/:id/cancel`, look up the event's **own** `clubId` in the database, and check the user's role in _that_ club. Never trust a `clubId` sent in the request body.

## "For you" feed

**Implemented (Aryan, Nov 19):** authenticated `GET /api/feed` ranks followed
clubs (score 3), followed people's public RSVPs (score 2), profile interests
(score 1), then other upcoming events (score 0). One parameterized SQL query
returns `{ items, total }` from the same snapshot, including the correct total
for an empty page past the end. Query validation and response types are
`feedListQuerySchema` and `FeedEvent` in [shared](../shared/src/index.ts).
Production SQL privacy/ranking tests pass against the actual Drizzle schema in
isolated PostgreSQL (PGlite), and intercepted-API browser regressions pass. Live
demo-account rehearsal remains pending; see [the verification runbook](tasks/aryan-feed-demo.md).

| Status | Method | Path                       | Who       | Notes                                                                                                       |
| ------ | ------ | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/feed?limit=&offset=` | Signed in | Upcoming, not-cancelled events, ranked for the signed-in user. Each item is an `EventSummary` plus `reason` |

Ranking: every event gets the **highest** matching group, then the feed is sorted by group, then soonest first (`ORDER BY score DESC, starts_at, id`, so pagination stays stable):

1. **From a club you follow.** `reason: "followed_club"`
2. **A person you follow is going or interested.** `reason: "followed_user"`. Both RSVP statuses qualify, but **only count RSVPs with `showOnAttendeeList = true`**. Left-join the RSVP user's profile and allow `is_public IS NULL OR is_public = true`: a missing profile row counts as public. **Exclude a followed person who has blocked the viewer** (`blocker_id = RSVP user`, `blocked_id = viewer`), matching the direction of `notBlockedBy` in [blocks.ts](../server/src/blocks.ts). Anonymous RSVPs and private or blocking users must not reveal social activity through the feed.
3. **Its category is one of your profile interests.** `reason: "interest"`
4. Everything else. `reason: null`

The frontend shows the reason on the card ("From a club you follow", exactly
"People you follow are going" for `followed_user`, including interested RSVPs).
The feed never includes attendee identities; names belong on the event's public
attendee list only. Signed-out visitors use the normal `GET /api/events` list.

Home-page URL state uses `q`, `category`, one-based `page`, and `tab=all|for-you`
through `useSearchParams`. Search/category apply to All events; For you uses only
API `limit`/`offset` and retains those filters for switching back. With 12 cards
per page, URL `page=2` means API `offset=12`. Opening an event from the feed carries
the query to the detail page's **Back to events** link. A direct detail visit
without feed navigation state returns to `/`.

## RSVPs, saves, and the dashboard

| Status | Method       | Path                        | Who       | Notes                                                                                                                                             |
| ------ | ------------ | --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET          | `/api/events/:id/rsvp`      | Public    | `{ goingCount, interestedCount, mine }`. Counts include anonymous RSVPs; `mine` is `null` when signed out                                         |
| ✅     | PUT          | `/api/events/:id/rsvp`      | Signed in | `{ status, showOnAttendeeList?, purpose?, lookingForBuddy? }`. Creates or updates. 400 if cancelled or ended                                      |
| ✅     | DELETE       | `/api/events/:id/rsvp`      | Signed in | 204, even if you had no RSVP                                                                                                                      |
| ✅     | GET          | `/api/events/:id/attendees` | Signed in | **Only** users with `showOnAttendeeList = true` **and** a public profile (no profile row counts as public)                                        |
| ⬜     | PUT / DELETE | `/api/events/:id/save`      | Signed in | Save or unsave                                                                                                                                    |
| ✅     | GET          | `/api/me/events`            | Signed in | Dashboard: `{ upcoming, past }`, each item `{ event, rsvp }`. Upcoming soonest first, past most recent first. Saved events: TODO if Save is built |
| ✅     | GET          | `/api/me/clubs`             | Signed in | `MyClub[]`: clubs I'm an exec of, with my `role`, A to Z                                                                                          |

**RSVPs are visible by default, with an option to RSVP anonymously.** `showOnAttendeeList` defaults to `true`. In the UI, show a toggle labelled "Show me on the attendee list" **inside the RSVP step itself, switched on**, so students see it every time and can turn it off before confirming. Students with a non-public profile never appear, whatever the toggle says.

**Save is low priority.** "Interested" already covers "keep this on my radar", so build Save last, or drop it if time runs out.

## Profiles

| Status | Method | Path                    | Who       | Notes                                                                                                                                                           |
| ------ | ------ | ----------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/profiles/:userId` | Signed in | `Profile`: name, picture, program, year, bio, interests, links, plus `isFollowing`. 404 if the profile isn't public (unless it's your own)                      |
| ✅     | PUT    | `/api/me/profile`       | Signed in | `updateProfileSchema`. Send only changed fields; creates the profile on first save. Going private (`isPublic: false`) removes your followers. Returns `Profile` |

**Types in `shared/src/index.ts`:** validate the `PUT` body with `updateProfileSchema` (interests only from `EVENT_CATEGORIES`, links only http(s) from `LINK_KINDS`, blank text becomes `null`). The response type is `Profile`. The profile pages use both.

**Profile pictures** are stored in Better Auth's `user.image` column as the **full public URL**. Update it with `authClient.updateUser({ image })` after uploading (see Uploads). Club logos use `club.logoKey`, and event images use `event.imageKey`, which store the S3 key; the API turns those into URLs.

## Following

Following is **one-way and needs no approval**: follow a club or a person, and their events show up higher in your "For you" feed.

| Status | Method       | Path                        | Who       | Notes                                                                                                  |
| ------ | ------------ | --------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| ✅     | PUT / DELETE | `/api/clubs/:clubId/follow` | Signed in | Follow or unfollow a club (also listed under Clubs). 204, safe to repeat                               |
| ✅     | PUT / DELETE | `/api/users/:userId/follow` | Signed in | Follow or unfollow a student. 400 for yourself. 404 if their profile isn't public. 204, safe to repeat |
| ✅     | GET          | `/api/me/following`         | Signed in | `MyFollowing`: `{ clubs, users }` I follow, A to Z. Only I can see my own list                         |
| ✅     | GET          | `/api/me/followers`         | Signed in | `UserSummary[]`: people who follow me, A to Z. **Only I can see my own followers**                     |
| ✅     | PUT / DELETE | `/api/users/:userId/block`  | Signed in | Block or unblock someone. 400 for yourself, 404 if they don't exist. 204, safe to repeat               |
| ✅     | GET          | `/api/me/blocked`           | Signed in | `UserSummary[]`: people I've blocked, A to Z, so I can unblock them                                    |

Rules:

- **No follower counts anywhere, and nobody can see anyone else's followers** (for students or clubs). This isn't a popularity contest. You can see your **own** followers, so you know who can see where you're going, and block anyone you don't want following you.
- Following someone doesn't reveal anything extra about them. You still only see their public profile and the attendee lists they appear on.

### Blocking (silent)

If A blocks B, then **to B, A looks exactly like a private profile**. B is never told:

- A's profile returns 404 for B, and B can't follow A (same 404 as a private profile).
- B's existing follow of A is removed. Unblocking doesn't bring it back.
- A disappears from B's People search, suggestions, Following list, and attendee lists.
- The "For you" feed must not use A's RSVPs for B (see the feed rules above).

Every query that lists other students must include `notBlockedBy(personColumn, viewerId)` from `server/src/blocks.ts`. Known gap: club exec lists (`GET /api/clubs/:clubId/members`) still show A to B, since club roles are public.

## Finding people

So friends can find and follow each other. **Only public profiles are ever returned, never yourself, and never emails.**

| Status | Method | Path                           | Who       | Notes                                                                                                                                                             |
| ------ | ------ | ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/users?q=&limit=&offset=` | Signed in | `Paginated<PersonSummary>`. No `q`: everyone, A to Z. `q`: searches name and program. Max 50 per page                                                             |
| ✅     | GET    | `/api/users/suggestions`       | Signed in | `PersonSummary[]`: up to 10 people sharing at least one of your interests, most shared first, excluding people you already follow. Empty if you have no interests |

`PersonSummary` is `{ id, name, image, program, yearOfStudy, isFollowing, sharedInterests }`. The frontend page is `/people` ("People" in the nav).

## Uploads

| Status | Method | Path           | Who       | Notes                                                                                                                                                        |
| ------ | ------ | -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅     | POST   | `/api/uploads` | Signed in | `{ folder: "clubs" \| "events" \| "users", contentType, size }` returns `{ key, uploadUrl, publicUrl }`. jpeg/png/webp/gif, max 5 MB. See `server/src/s3.ts` |

Now **required**, not a stretch goal: club logos, event images, and profile pictures all depend on it.

Upload flow: (1) ask `POST /api/uploads` for an upload URL, sending the file's `type` and `size`, (2) the browser `PUT`s the file directly to `uploadUrl` within 5 minutes, with the **same `Content-Type` header** (S3 rejects a different type or size), (3) save the result: `key` for clubs and events (via their `PATCH` endpoints), or `publicUrl` for your profile picture (via `authClient.updateUser`).

Security: when a `PATCH` saves a `logoKey` or `imageKey`, check it starts with the right folder (`clubs/` or `events/`). Otherwise someone could point their club's logo at any file in the bucket. (Done: `uploadKeySchema` in shared. Profile pictures are checked the same way in `server/src/auth.ts`, so `user.image` can only be an Orbit upload.)

Profile pictures are uploaded to `users/<your user id>/...`, and saving `user.image` only accepts a picture from **your own** folder. So nobody can copy someone else's picture URL to pose as them. A new account can't be created with a picture; set it after signing up.

## Privacy rules (summary)

| Who can see...              | Answer                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| A public profile            | Any signed-in student: it appears in People search and suggestions, and can be followed                  |
| A non-public profile        | Only its owner. It never appears in People search, suggestions, or attendee lists, and can't be followed |
| That you RSVP'd to an event | Any signed-in student, on the attendee list, unless you RSVP'd anonymously (toggle off)                  |
| Who you follow              | Only you                                                                                                 |
| Who follows you             | Only you (`/me/followers`). Nobody can see anyone else's followers, and no counts are shown              |
| You, if you've blocked them | Nothing: to them you look like a private profile, and they aren't told                                   |

## Errors

Every error response looks like `{ "error": "message" }`. Status codes:
`400` invalid input (validation errors also include `issues`) · `401` not signed in · `403` signed in but not allowed · `404` not found · `500` server bug.
