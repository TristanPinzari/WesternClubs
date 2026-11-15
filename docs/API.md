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

| Status | Method       | Path                                    | Who                       | Notes                                                                              |
| ------ | ------------ | --------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| ✅     | GET          | `/api/clubs?q=&limit=&offset=`          | Public                    | Search and list clubs                                                              |
| ✅     | GET          | `/api/clubs/:slug`                      | Public                    | Club details                                                                       |
| ⬜     | POST         | `/api/clubs`                            | Signed in                 | Creator becomes **owner**. Use a transaction                                       |
| ⬜     | PATCH        | `/api/clubs/:clubId`                    | Owner, Admin              | Name, description, logo, links                                                     |
| ⬜     | DELETE       | `/api/clubs/:clubId`                    | Owner                     |                                                                                    |
| ⬜     | GET          | `/api/clubs/:clubId/members`            | Public                    | Execs and their roles                                                              |
| ⬜     | POST         | `/api/clubs/:clubId/members`            | Owner, Admin              | `{ email, role }`. Add an exec by their Orbit email                                |
| ⬜     | PATCH        | `/api/clubs/:clubId/members/:userId`    | Owner, Admin              | `{ role }`. See rules below                                                        |
| ⬜     | DELETE       | `/api/clubs/:clubId/members/:userId`    | Owner, Admin, or yourself | Remove an exec, or leave the club                                                  |
| ⬜     | POST         | `/api/clubs/:clubId/transfer-ownership` | Owner                     | `{ userId }`. Must already be a member. Old owner becomes admin. Use a transaction |
| ⬜     | PUT / DELETE | `/api/clubs/:clubId/follow`             | Signed in                 | Follow or unfollow                                                                 |

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

## Events

| Status | Method | Path                                                    | Who                              | Notes                                                                                                                                 |
| ------ | ------ | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | GET    | `/api/events?q=&category=&clubId=&from=&limit=&offset=` | Public                           | Upcoming, not-cancelled events, soonest first. `q` searches title, description, and club name                                         |
| ✅     | GET    | `/api/events/:id`                                       | Public                           | Includes club info. Also returns past/cancelled events (check `cancelledAt`). Going/interested counts: TODO, once `event_rsvp` exists |
| ⬜     | POST   | `/api/clubs/:clubId/events`                             | Owner, Admin, Editor             |                                                                                                                                       |
| ⬜     | PATCH  | `/api/events/:id`                                       | That club's Owner, Admin, Editor |                                                                                                                                       |
| ⬜     | POST   | `/api/events/:id/cancel`                                | That club's Owner, Admin, Editor | Sets `cancelledAt`                                                                                                                    |

## RSVPs, saves, and the dashboard

| Status | Method       | Path                        | Who       | Notes                                                                            |
| ------ | ------------ | --------------------------- | --------- | -------------------------------------------------------------------------------- |
| ⬜     | PUT          | `/api/events/:id/rsvp`      | Signed in | `{ status, showOnAttendeeList, purpose?, lookingForBuddy? }`. Creates or updates |
| ⬜     | DELETE       | `/api/events/:id/rsvp`      | Signed in |                                                                                  |
| ⬜     | GET          | `/api/events/:id/attendees` | Signed in | **Only** users with `showOnAttendeeList = true` and a public profile             |
| ⬜     | PUT / DELETE | `/api/events/:id/save`      | Signed in | Save or unsave                                                                   |
| ⬜     | GET          | `/api/me/events`            | Signed in | Dashboard: my RSVPs and saved events, upcoming first                             |
| ⬜     | GET          | `/api/me/clubs`             | Signed in | Clubs I'm an exec of, with my role                                               |

## Profiles

| Status | Method | Path                    | Who       | Notes                                                  |
| ------ | ------ | ----------------------- | --------- | ------------------------------------------------------ |
| ⬜     | GET    | `/api/profiles/:userId` | Signed in | 404 if the profile isn't public (unless it's your own) |
| ⬜     | PUT    | `/api/me/profile`       | Signed in | Program, year, bio, interests, links, isPublic         |

## Connections

| Status | Method | Path                          | Who                | Notes                                                            |
| ------ | ------ | ----------------------------- | ------------------ | ---------------------------------------------------------------- |
| ⬜     | GET    | `/api/connections`            | Signed in          | My accepted connections, plus pending requests sent and received |
| ⬜     | POST   | `/api/connections`            | Signed in          | `{ userId }`. Can't connect with yourself or send a duplicate    |
| ⬜     | POST   | `/api/connections/:id/accept` | The addressee only |                                                                  |
| ⬜     | DELETE | `/api/connections/:id`        | Either person      | Decline, cancel, or remove                                       |

## Uploads

| Status | Method | Path           | Who       | Notes                                                                                                                               |
| ------ | ------ | -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ⬜     | POST   | `/api/uploads` | Signed in | `{ folder: "clubs" \| "events", contentType }` returns `{ key, uploadUrl }`. Only allow image content types. See `server/src/s3.ts` |

## Errors

Every error response looks like `{ "error": "message" }`. Status codes:
`400` invalid input (validation errors also include `issues`) · `401` not signed in · `403` signed in but not allowed · `404` not found · `500` server bug.
