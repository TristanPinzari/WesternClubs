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
- **Renaming a club (`PATCH`) changes only `name`. The slug stays the same**, so links people have shared (Instagram bios, posters, group chats) keep working.
- Letting owners change the slug themselves is a possible future feature, not part of the hackathon.

## Events

| Status | Method | Path                                                    | Who                              | Notes                                                                                                                                 |
| ------ | ------ | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/events?q=&category=&clubId=&from=&limit=&offset=` | Public                           | Upcoming, not-cancelled events, soonest first. `q` searches title, description, and club name                                         |
| ✅     | GET    | `/api/events/:id`                                       | Public                           | Includes club info. Also returns past/cancelled events (check `cancelledAt`). Going/interested counts: TODO, once `event_rsvp` exists |
| ✅     | POST   | `/api/clubs/:clubId/events`                             | Owner, Admin, Editor             | `createEventSchema`. Title, category, startsAt required. Must start in the future. Returns 201 with `EventDetail`                     |
| ✅     | PATCH  | `/api/events/:id`                                       | That club's Owner, Admin, Editor | `updateEventSchema`: send only changed fields (`null` clears). Can't move clubs. 409 if cancelled. Returns `EventDetail`              |
| ✅     | POST   | `/api/events/:id/cancel`                                | That club's Owner, Admin, Editor | Sets `cancelledAt`. Permanent; cancelling twice keeps the first time. Returns `EventDetail`                                           |

For `PATCH /api/events/:id` and `POST /api/events/:id/cancel`, look up the event's **own** `clubId` in the database, and check the user's role in _that_ club. Never trust a `clubId` sent in the request body.

## "For you" feed

**Incremental implementation (Aryan, Nov 18):** this branch now serves authenticated
`GET /api/feed` using followed clubs (score 3), profile interests (score 1), then
other upcoming events (score 0). One parameterized SQL query returns the page and
total from the same snapshot, including an empty page past the end. Query validation
and response types are `feedListQuerySchema` and `FeedEvent` in shared.

The overall task remains unchecked below because score 2 (`followed_user`) waits
for Rokyo's RSVP table to merge. No RSVP data is currently queried and the endpoint
does not yet return that reason. When adding it, exclude anonymous RSVPs and
private profiles; never return attendee identities in the feed.

| Status | Method | Path                       | Who       | Notes                                                                                                       |
| ------ | ------ | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| ⬜     | GET    | `/api/feed?limit=&offset=` | Signed in | Upcoming, not-cancelled events, ranked for the signed-in user. Each item is an `EventSummary` plus `reason` |

Ranking: every event gets the **highest** matching group, then the feed is sorted by group, then soonest first (`ORDER BY score DESC, starts_at, id`, so pagination stays stable):

1. **From a club you follow.** `reason: "followed_club"`
2. **A person you follow is going or interested.** `reason: "followed_user"`. **Only count RSVPs with `showOnAttendeeList = true`.** Otherwise the feed would reveal RSVPs made anonymously.
3. **Its category is one of your profile interests.** `reason: "interest"`
4. Everything else. `reason: null`

The frontend shows the reason on the card ("From a club you follow", "People you follow are going"). Don't list _which_ people: names belong on the event's public attendee list only. Signed-out visitors use the normal `GET /api/events` list.

## RSVPs, saves, and the dashboard

| Status | Method       | Path                        | Who       | Notes                                                                            |
| ------ | ------------ | --------------------------- | --------- | -------------------------------------------------------------------------------- |
| ⬜     | PUT          | `/api/events/:id/rsvp`      | Signed in | `{ status, showOnAttendeeList, purpose?, lookingForBuddy? }`. Creates or updates |
| ⬜     | DELETE       | `/api/events/:id/rsvp`      | Signed in |                                                                                  |
| ⬜     | GET          | `/api/events/:id/attendees` | Signed in | **Only** users with `showOnAttendeeList = true` and a public profile             |
| ⬜     | PUT / DELETE | `/api/events/:id/save`      | Signed in | Save or unsave                                                                   |
| ⬜     | GET          | `/api/me/events`            | Signed in | Dashboard: my RSVPs and saved events, upcoming first                             |
| ✅     | GET          | `/api/me/clubs`             | Signed in | `MyClub[]`: clubs I'm an exec of, with my `role`, A to Z                         |

**RSVPs are visible by default, with an option to RSVP anonymously.** `showOnAttendeeList` defaults to `true`. In the UI, show a toggle labelled "Show me on the attendee list" **inside the RSVP step itself, switched on**, so students see it every time and can turn it off before confirming. Students with a non-public profile never appear, whatever the toggle says.

**Save is low priority.** "Interested" already covers "keep this on my radar", so build Save last, or drop it if time runs out.

## Profiles

| Status | Method | Path                    | Who       | Notes                                                                                                                                                           |
| ------ | ------ | ----------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/profiles/:userId` | Signed in | `Profile`: name, picture, program, year, bio, interests, links, plus `isFollowing`. 404 if the profile isn't public (unless it's your own)                      |
| ✅     | PUT    | `/api/me/profile`       | Signed in | `updateProfileSchema`. Send only changed fields; creates the profile on first save. Going private (`isPublic: false`) removes your followers. Returns `Profile` |

**Profile pictures** are stored in Better Auth's `user.image` column as the **full public URL**. Update it with `authClient.updateUser({ image })` after uploading (see Uploads). Club logos use `club.logoKey`, and event images use `event.imageKey`, which store the S3 key; the API turns those into URLs.

## Following

Following is **one-way and needs no approval**: follow a club or a person, and their events show up higher in your "For you" feed.

| Status | Method       | Path                        | Who       | Notes                                                                                                  |
| ------ | ------------ | --------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| ✅     | PUT / DELETE | `/api/clubs/:clubId/follow` | Signed in | Follow or unfollow a club (also listed under Clubs). 204, safe to repeat                               |
| ✅     | PUT / DELETE | `/api/users/:userId/follow` | Signed in | Follow or unfollow a student. 400 for yourself. 404 if their profile isn't public. 204, safe to repeat |
| ✅     | GET          | `/api/me/following`         | Signed in | `MyFollowing`: `{ clubs, users }` I follow, A to Z. Only I can see my own list                         |

Rules:

- **No follower counts and no follower lists, anywhere** (for students or clubs). This isn't a popularity contest. The API never returns them, so the UI can't show them.
- Following someone doesn't reveal anything extra about them. You still only see their public profile and the attendee lists they appear on.

## Uploads

| Status | Method | Path           | Who       | Notes                                                                                                                                                        |
| ------ | ------ | -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅     | POST   | `/api/uploads` | Signed in | `{ folder: "clubs" \| "events" \| "users", contentType, size }` returns `{ key, uploadUrl, publicUrl }`. jpeg/png/webp/gif, max 5 MB. See `server/src/s3.ts` |

Now **required**, not a stretch goal: club logos, event images, and profile pictures all depend on it.

Upload flow: (1) ask `POST /api/uploads` for an upload URL, sending the file's `type` and `size`, (2) the browser `PUT`s the file directly to `uploadUrl` within 5 minutes, with the **same `Content-Type` header** (S3 rejects a different type or size), (3) save the result: `key` for clubs and events (via their `PATCH` endpoints), or `publicUrl` for your profile picture (via `authClient.updateUser`).

Security: when a `PATCH` saves a `logoKey` or `imageKey`, check it starts with the right folder (`clubs/` or `events/`). Otherwise someone could point their club's logo at any file in the bucket. (Done: `uploadKeySchema` in shared. Profile pictures are checked the same way in `server/src/auth.ts`, so `user.image` can only be an Orbit upload.)

## Privacy rules (summary)

| Who can see...              | Answer                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| A public profile            | Any signed-in student, who can also follow it                                           |
| A non-public profile        | Only its owner. It can't be followed, and its owner never appears on attendee lists     |
| That you RSVP'd to an event | Any signed-in student, on the attendee list, unless you RSVP'd anonymously (toggle off) |
| Who you follow              | Only you                                                                                |
| Who follows you / how many  | Nobody, not even you                                                                    |

## Errors

Every error response looks like `{ "error": "message" }`. Status codes:
`400` invalid input (validation errors also include `issues`) · `401` not signed in · `403` signed in but not allowed · `404` not found · `500` server bug.
