<!--
  WHAT: Aryan's implementation walkthrough, verification record, and PR handoff.
  WITHOUT IT: It would be hard to distinguish Aryan's work from the backend dependency
    or explain which checks were actually performed.
-->

# Aryan: implementation and PR readiness

## Current status: November 18, 2026

**Merged-main only, as Aryan requested.** Main `26997ef` is included in the feature
branch through merge commit `4a5ab04`. Local `main` still points to `36fe673`; no
push to GitHub or merge into main was made. Rokyo's auth PR #19 is already in main
and its pages/menu are retained. His RSVP PR #20, dashboard #21 and profiles #22
were not imported. The private GitHub connector could not read review status;
the branch/ref history establishes which code is already in main.

### What is complete now

The checklist's B–F features are now integrated with Naksh's merged backend and
verified against Aryan's personal Neon branch, not just mocks:

- Public club page/events, real Follow/Unfollow, and role-aware exec entry points.
- Club creation, server-generated slug/redirect, saved logo and links.
- Event post/edit/cancel, date/price validation, persisted details after refresh,
  registration fields, and uploaded event images.
- Reusable upload control, real signed tickets, browser PUT/CORS, and public images.
- Club settings with stable rename URLs; exec add/promote/remove/transfer, My clubs,
  and real server 403s for unauthorized operations.
- Sign-in/out through Rokyo's merged UI still works with Aryan's routes.

G is **partially complete**: authenticated `/api/feed` now ranks followed clubs
(score 3), profile interests (score 1), then other upcoming events (score 0).
It returns a stable page and total in one SQL query. The followed-person/public-RSVP
group (score 2) remains pending Rokyo's **merged** table. No RSVP data is queried
and no `followed_user` reason is currently emitted by the live endpoint. Full G
and H's persistent social seed remain unchecked; temporary test accounts are not
the requested demo seed. URL-based filter persistence stays deferred.

### Important integration changes to understand

| File(s)                                                                                                                                                           | Why this changed                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [App.tsx](../../client/src/App.tsx)                                                                                                                               | Resolved the merge by keeping both Aryan's routes and Rokyo's sign-in/up/menu. Mock exec mode does not call real auth. The long demo banner remains removed at Aryan's request.                                     |
| [execTypes.ts](../../client/src/lib/execTypes.ts)                                                                                                                 | Re-exports the real shared club/member/upload types instead of maintaining guessed API copies. Only serialized form dates and UI helpers stay client-specific.                                                      |
| [ClubForm.tsx](../../client/src/components/ClubForm.tsx)                                                                                                          | Uses shared name/description validation and fixed link kinds: website, instagram, linkedin, discord, github. Arbitrary labels would be discarded by the API.                                                        |
| [clubs.ts](../../client/src/lib/clubs.ts), [CreateClubPage.tsx](../../client/src/pages/CreateClubPage.tsx)                                                        | POST creates name/description; a subsequent PATCH saves logo/links. If PATCH fails after successful creation, redirect to the created club with a warning rather than offering a duplicate-creation retry.          |
| [uploads.ts](../../client/src/lib/uploads.ts)                                                                                                                     | Uses the shared image types/size limit and sends `size: file.size`, required for the signed upload. S3 PUT omits app credentials and the browser supplies Content-Length.                                           |
| [EventForm.tsx](../../client/src/components/EventForm.tsx), [formUtils.ts](../../client/src/lib/formUtils.ts)                                                     | Match main's event lengths, HTTP(S) links, image-key validation and $10,000 maximum. The real shared event schema validates before saving.                                                                          |
| [ExecMembers.tsx](../../client/src/components/ExecMembers.tsx)                                                                                                    | Public members expose name/image/role, not emails. Email remains an input only when adding an exec.                                                                                                                 |
| [mockExec.ts](../../client/src/data/mockExec.ts)                                                                                                                  | Demo objects now match shared response fields and use correctly shaped image keys. The mock database is still in memory, reset by refresh.                                                                          |
| [feed.ts query](../../server/src/queries/feed.ts)                                                                                                                 | `EXISTS` avoids duplicate event rows from follows, CASE chooses the highest available signal, and time/id break ties. User ID, pagination, and image URL prefix are SQL parameters.                                 |
| [feed.ts route](../../server/src/routes/feed.ts), [server entry](../../server/src/index.ts), [shared types](../../shared/src/index.ts), [API contract](../API.md) | Require sign-in, validate pagination, mount the endpoint, and document its deliberately incomplete RSVP ranking. These are Aryan's assigned backend additions; teammate mutation/auth/schema code is not rewritten. |

### Verification and safety

- `npm ci` succeeded with main's merged lockfile and upload SDK dependencies.
- `npm run db:push` applied main's schema to the previously confirmed personal Neon
  branch. No blanket event deletion, old-fixture cleanup, or re-seed was performed.
- Typecheck, production build, formatting, whitespace checks and 14 unit tests pass.
- [Mock/contract browser checks](../../tests/aryan-browser.mjs) cover all prior
  flows plus actual shared request fields and partial-creation recovery.
- [Live browser checks](../../tests/aryan-live.mjs) use real Better Auth sessions,
  temporary clubs/events/accounts, real uploads, role changes, ownership transfer,
  follow/unfollow, sign-in/out, and SQL ranking/pagination/auth validation.
- Each live run removes only the exact club/user/image IDs it created. Original
  data is preserved. Passwords, session tokens and signed URLs are never printed.
  Test fixtures are disposable and can be recreated by running the suite again.
- `npm audit` reports four moderate findings through the existing Drizzle/
  esbuild-kit tooling chain. No force upgrade/downgrade was attempted. The lockfile
  also retains earlier committed npm metadata/optional-package differences from
  main; these were not silently discarded during integration.
- The private environment file remains ignored/untracked and was not opened by
  file-reading tools. The server/test processes load it normally without printing it.

The backup stash is retained: `d11224129522544e73bec60fced278205bb36139`
(`aryan-before-main-sync-2026-11-18`). Its changes are already restored; **do not
apply it again**. Only the main merge was committed. Feature edits remain local;
the previously omitted walkthrough remains staged so it is not missed again.

### Running and repeating the checks

Normal app: `npm run dev`, then `http://localhost:5173`. Sign in with your own
Western account, create a club or use a club where you are an exec, and follow
clubs to see them prioritized under For you. Data here is saved to your configured
Neon branch; the old port-5174 screen is only the in-memory frontend demo.

```bash
npm run typecheck
npm run build
npm run format:check
node --import tsx --test tests/event-discovery.test.ts tests/club-exec.test.ts
git diff --check
```

Browser runner requires Playwright and Google Chrome. With the live API/frontend
on 3000/5173 and explicit exec-demo Vite on 5174:

```bash
node tests/aryan-browser.mjs /absolute/path/to/playwright/index.mjs
```

The live suite makes temporary real writes. Run it only on your personal Neon
branch, with working image storage and no shared/production connection:

```bash
ORBIT_ALLOW_TEST_WRITES=personal-neon node --import tsx --env-file=server/.env tests/aryan-live.mjs /absolute/path/to/playwright/index.mjs
```

### Remaining handoff

Finish the PR #18 review cycle by reviewing, committing and pushing the intended
feature changes, including this walkthrough. Do not push main. The new club-exec
work is substantial; keep it a separate review unit/follow-up PR if Tristan prefers.
When Rokyo's RSVP schema merges, sync it into this feature branch, add score 2
using only public/visible RSVPs, and complete the permanent social demo seed through
Better Auth. Do not claim those last tasks are already done.

## Historical status: November 17, 2026 (superseded above)

Work stays on `feature/aryan-event-discovery`. Latest fetched main `124bc85` was
merged **into this feature branch** as `f68f6ba`. Local main still points to
`36fe673`; no push or merge to main was performed. PR #18's review fixes and the
new frontend work are local changes, not published updates to the PR yet.

### What is finished, and what is not

- Review fixes: 300 ms search debounce, retain/dim old results while updating,
  real seed error before the setup hint, this previously omitted walkthrough,
  and stable scrollbar space. Pagination resets with the applied search/category
  without fetching page one of an old query. The `ignore` cleanup still rejects
  late responses; retained results keep their own page number.
- Public club detail works with main's actual GET endpoints. Club names link to
  their page, and the page lists only that club's upcoming events with pagination.
- New frontend implemented: create club, post/edit/cancel event, generic uploads,
  settings, exec management/ownership transfer, My clubs, club following, and
  personalized feed tabs/reasons. These are tested in explicit demo mode and/or
  with intercepted API responses. They are **not all production-integrated**.
- Naksh's create/write/member/follow/upload endpoints and shared response types
  have not merged into main. The app reports their errors; it never silently
  falls back to fake data in live mode. Current local array/envelope assumptions
  must be replaced or confirmed against his actual shared types before sign-off.
- Aryan's production `GET /api/feed` and real social demo seed are **not built**:
  `profile`, `club_follow`, `user_follow`, and `event_rsvp` are still TODOs in
  main's schema. Those tables belong to Naksh/Rokyo. Do not invent their schemas
  or claim the mock ranking function is the production SQL endpoint.
- No RSVP/profile/onboarding UI, following-people UI, follower counts/lists,
  server authorization, schema, or authentication changes were made. URL filter
  persistence stays deferred as the reviewer requested. Club deletion is not in
  Aryan's assigned checklist and was not added.

### Files and how to explain them

| File(s)                                                                                                                                                                                        | What to explain                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [useDebouncedValue.ts](../../client/src/hooks/useDebouncedValue.ts), [HomePage.tsx](../../client/src/pages/HomePage.tsx)                                                                       | Each keystroke clears the previous timer. Only the settled value triggers an event request. Old cards stay visible; errors do not pretend they are new results. Personalized cards cannot remain visible after sign-out.                                                        |
| [index.css](../../client/src/index.css), [seed.ts](../../server/src/db/seed.ts)                                                                                                                | Reserve scrollbar width; log `err instanceof Error ? err.message : err` before the existing setup hint. No environment file contents are logged by our code.                                                                                                                    |
| [useResource.ts](../../client/src/hooks/useResource.ts), [RequestState.tsx](../../client/src/components/RequestState.tsx)                                                                      | Loading/error/retry state plus cleanup that ignores obsolete results. A new resource/session cannot display the previous resource's data.                                                                                                                                       |
| [useViewer.ts](../../client/src/hooks/useViewer.ts), [useClubAccess.ts](../../client/src/hooks/useClubAccess.ts)                                                                               | Real sessions come from Better Auth. Roles come from `/me/clubs`, never from a user-editable field. These hide controls but do not replace server authorization.                                                                                                                |
| [execTypes.ts](../../client/src/lib/execTypes.ts), [clubs.ts](../../client/src/lib/clubs.ts), [api.ts](../../client/src/lib/api.ts)                                                            | Temporary frontend contracts and one API adapter. Mutation helper handles JSON, failures, and 204. Replace temporary response types with Naksh's shared exports when they land.                                                                                                 |
| [ClubsPage.tsx](../../client/src/pages/ClubsPage.tsx), [ClubDetailPage.tsx](../../client/src/pages/ClubDetailPage.tsx)                                                                         | Searchable linked clubs; info/logo/links, `clubId`-filtered events, Follow, and role-aware exec entry points. No follower counts.                                                                                                                                               |
| [CreateClubPage.tsx](../../client/src/pages/CreateClubPage.tsx), [ClubForm.tsx](../../client/src/components/ClubForm.tsx), [Field.tsx](../../client/src/components/Field.tsx)                  | Create/save only after validation, redirect using the server's slug, validate HTTP(S) links, and preserve the slug when renaming. Every input has an accessible label.                                                                                                          |
| [EventEditorPage.tsx](../../client/src/pages/EventEditorPage.tsx), [EventForm.tsx](../../client/src/components/EventForm.tsx), [formUtils.ts](../../client/src/lib/formUtils.ts)               | Load the event's own club, convert dollars to integer cents, convert explicitly labelled device-local dates to ISO, require end after start, validate registration links, confirm cancellation.                                                                                 |
| [ImageUpload.tsx](../../client/src/components/ImageUpload.tsx), [uploads.ts](../../client/src/lib/uploads.ts)                                                                                  | Ask `/uploads` for a ticket, PUT to storage without our cookies, return `key` and `publicUrl` only on success. Parent save is disabled while uploading. Reject SVG/non-images and files over 5 MB; this client limit is not a server security guarantee.                        |
| [ClubSettingsPage.tsx](../../client/src/pages/ClubSettingsPage.tsx), [ExecMembers.tsx](../../client/src/components/ExecMembers.tsx), [MyClubsPage.tsx](../../client/src/pages/MyClubsPage.tsx) | Owners/admins edit details; only owners manage admins/transfer ownership. Nobody can demote/remove the owner. Transfer requires an existing exec, typed club name, and confirmation. Editors only post/edit events.                                                             |
| [FollowClubButton.tsx](../../client/src/components/FollowClubButton.tsx), [events.ts](../../client/src/lib/events.ts), [EventCard.tsx](../../client/src/components/EventCard.tsx)              | Follow/unfollow is one-way; fetch the feed with limit/offset, and show only its reason text, not people's identities. Search/category filters belong to All events because `/feed` does not accept them.                                                                        |
| [demoMode.ts](../../client/src/lib/demoMode.ts), [mockExec.ts](../../client/src/data/mockExec.ts), [demoFeed.ts](../../client/src/lib/demoFeed.ts)                                             | Explicit, labelled, in-memory fixtures. Refresh resets edits. Rank by followed club, then public RSVP of a followed person, then interest, then time/id. Anonymous and private-profile RSVPs cannot influence the demo feed. This is not production SQL or real social seeding. |
| [App.tsx](../../client/src/App.tsx), [EventDetailPage.tsx](../../client/src/pages/EventDetailPage.tsx)                                                                                         | Register the new routes, show the demo warning, link event organizers to clubs, and offer Edit only to club execs. Rokyo's attendance area is preserved.                                                                                                                        |
| [club-exec.test.ts](../../tests/club-exec.test.ts), [aryan-browser.mjs](../../tests/aryan-browser.mjs)                                                                                         | Database-free validation/privacy tests and repeatable browser checks. All browser mutations are mocked/intercepted; only public GET checks reach the real API.                                                                                                                  |

### Integration contract checklist (pending)

The API documents the paths, but not every response envelope. The provisional
client adapter currently expects:

- `POST /clubs` → club object containing `id` and `slug`.
- `GET /clubs/:slug` → `ClubSummary` plus optional `links`.
- `GET /me/clubs` → array of club objects with `role`.
- `GET /clubs/:clubId/members` → array of `{ userId, name, email, role }`.
- `GET /me/following` → `{ clubs: ClubSummary[], users: ... }`.
- `POST /clubs/:clubId/events` → object with `id`; other writes may return 204.
- `GET /feed` → `{ items: (EventSummary & { reason })[], total }`.
- `POST /uploads` → the documented `{ key, uploadUrl, publicUrl }`.

Confirm these with the actual shared types; do not alter teammates' APIs to fit
frontend guesses. Verify all 401/403 permission cases against the real server,
storage CORS/upload constraints, renamed-club URLs, and image preservation.
Then implement Aryan's SQL ranking query with stable `score DESC, starts_at, id`
ordering and privacy predicates, and seed real demo accounts through Better Auth
with an explicit demo-only password supplied privately, never committed.

### Verification on November 17

- Whole-workspace typecheck and production build pass.
- All 12 unit tests pass (5 original plus 7 new).
- Nine Chrome test groups pass: demo feed/reasons; club/follow flows; event
  post/edit/cancel/image/validation; create/rename/exec/transfer; admin/editor and
  mobile layout restrictions; debounce/retained results/error/race handling;
  signed-out restrictions/feed adapter; upload failure/retry/key handling;
  real public club/detail/feed reads. No uncaught browser errors.
- Browser measured zero API requests in full exec mock mode. Typing ten letters
  from page two produced exactly one debounced event request with offset zero.
- Responsive checks cover 320/375/768/1440px settings, and 375px feed, club page,
  and event form. New screenshots are in [aryan-screenshots](aryan-screenshots/).
- No new dependencies, schema writes, seed execution, database cleanup, or real
  API mutations in this pass. Main's backend/shared files remain untouched except
  Aryan's existing demo seed work and the requested seed-error logging fix.

Repeat checks:

```bash
npm run typecheck
npm run build
npm run format:check
node --import tsx --test tests/event-discovery.test.ts tests/club-exec.test.ts
git diff --check
```

Normal app: `npm run dev`, visit `http://localhost:5173`.
Frontend demo in another terminal:

```bash
VITE_USE_MOCK_EXEC=true npm run dev -w client -- --port 5174 --strictPort
```

Visit `http://localhost:5174`. Western AI has a demo owner, Western Science
Society a demo admin, and Western Finance Association a demo editor. These are
fictional client actors, not new users in Neon. All edits reset on refresh.
The `VITE_` flag is public configuration; never put server secrets there.

The browser runner requires an installed Playwright package and Google Chrome:
`node tests/aryan-browser.mjs /absolute/path/to/playwright/index.mjs`.
Both Vite servers and the real API must be running for its last, read-only group.
Playwright was reused from a temporary test installation, not added to the repo.

### PR handoff

The mentor asks to finish PR #18 first. Keep review fixes and the new mock-first
features as distinct review units (prefer a follow-up PR for the new tasks).
Do not present the full new feature set as production-complete while the above
dependencies are missing. Review changes locally before committing/pushing;
no new feature commit, push, GitHub comment, or review-resolution was made here.

Include this walkthrough in Git: it was the omitted file causing the review's 404. The local link works now, but GitHub cannot display it until it is committed
and pushed to the PR branch. When editing a PR body on GitHub, use the branch URL
from [the prepared description](aryan-pr-description.md), not a relative path
that GitHub might resolve from a different directory. Upload screenshots directly
to the PR body when copying that description.

The mentor's one-time delete-and-reseed note was **not executed**. A Git branch
does not isolate Neon. Only consider cleanup on a confirmed personal database;
deleting all events also removes real test data and potentially cascading RSVPs.
Coordinate any cleanup of the shared demo database with Tristan.

## Historical November 14–16 record (superseded where noted above)

The rest of this document preserves the earlier audit. Statements below about
unimplemented club pages, immediate search, hiding old cards, branch hashes, and
uncommitted files describe that older snapshot, not the current implementation.

### Earlier result

The 15 core milestones were implemented and verified on November 14, 2026.
The feature branch was brought onto updated `main` on November 16, 2026;
see the compatibility recheck below for the new verification results.
Optional club-detail and recommendation stretch goals are not implemented.
No authentication, authorization, RSVP, dashboard, or new backend endpoint was
implemented as Aryan's work.

Work is on `feature/aryan-event-discovery`. No commit or push of Aryan's work was
made during this cleanup, and `main` was not changed. Uncommitted files are in
the working directory, not permanently attached to a branch: commit on this
feature branch before switching to another branch.

### Current base: main

Naksh's event API was squash-merged as `38ba71b`, followed by the Western-only
sign-up change `fbaf86e`. On November 16, `origin/main` was fetched and the feature
branch was rebased directly onto `fbaf86e62cb96ed3d5f6da9283b2ed8ae8757fcd`.
The old dependency commits `e282154` and `dd60e55` are no longer separate commits
on this branch: their work is already included in the merged API commit.

The earlier assistant-written duplicate event table, router, query schema, and
types were removed before importing Naksh's work. The following are now **identical
to updated main**, with no Aryan-specific changes:

- [Database schema](../../server/src/db/schema.ts)
- [Event routes](../../server/src/routes/events.ts)
- [Server entry point](../../server/src/index.ts)
- [Shared types and query validation](../../shared/src/index.ts)
- [API documentation](../API.md)
- [Authentication](../../server/src/auth.ts)

**The PR should now target `main` directly.** The previous stacked/dependent-PR
instructions no longer apply. Use `origin/main` for local comparisons: the local
`main` branch was deliberately left unchanged and may be behind the remote.

The rebase restored all feature edits from the saved stash. The only overlap was
[seed.ts](../../server/src/db/seed.ts): the resolution keeps Aryan's expanded data
and stable-ID upserts while explicitly clearing old fixture end times, preserving
the intent of main's seed-refresh fix. The backup stash
`73ee671ac3ff2e367514881dfc4bafd3367eaa58` is retained for recovery; do not apply it
again to this already-restored working directory.

## Milestone audit

| #   | Milestone                          | Evidence/status                                                                          |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Private environment file in server | Present, ignored by Git, and untracked; contents never displayed                         |
| 2   | Personal Neon branch               | Aryan explicitly confirmed the private connection points to his own branch               |
| 3   | Apply schema and seed              | Naksh's schema push succeeded; new seed succeeded twice                                  |
| 4   | Run app and verify Clubs           | Live Clubs list/search passed with nine clubs                                            |
| 5   | Mock events                        | Six typed fixtures; event UI works with backend requests blocked                         |
| 6   | Event card                         | Title, club, date/time, location, Free or CAD price; card links to detail                |
| 7   | Event feed                         | Searchable list, six category chips, empty state, 12-item pagination                     |
| 8   | Mobile search/categories           | Tested at 320/375/390px; all six categories, combined filters, clear filters             |
| 9   | Detail page                        | Description, eligibility, dates, price, location, registration; RSVP space only          |
| 10  | Route                              | `/events/:id` registered; `useParams()` supplies the ID                                  |
| 11  | Navigation/detail tests            | Card click, back link, direct URL, refresh, missing ID, cancelled/past cases             |
| 12  | Naksh's shared types               | Direct imports of his `EventSummary`, `EventDetail`, `EventListQuery`, `Paginated`       |
| 13  | API integration                    | Live GET `/api/events` and `/api/events/:id`; search/category/page parameters checked    |
| 14  | Request states                     | Loading, error, retry, empty results; delayed older responses cannot replace newer ones  |
| 15  | Seed events                        | 24 upcoming examples, four per category, free/paid, next 24 days; plus two test fixtures |

Git branches and Neon branches are independent. `db:push` and `db:seed` always
affect the database selected by `DATABASE_URL`, regardless of the Git branch.
Only run these commands when that URL points to your own Neon branch.

## What changed

| File                                                                                  | Purpose and the idea to understand                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [mockEvents.ts](../../client/src/data/mockEvents.ts)                                  | A hard-coded array with all six categories. Dates become ISO strings; the array follows Naksh's shared type. No database is needed.                    |
| [events.ts](../../client/src/lib/events.ts)                                           | The data boundary: explicit mock mode or real `apiGet` calls. Both pages use the same source. It never replaces a failing API with fake success.       |
| [eventDisplay.ts](../../client/src/lib/eventDisplay.ts)                               | Shared category labels, Ontario date/time formatting, cents-to-CAD display, and safe HTTP(S) registration links.                                       |
| [EventCard.tsx](../../client/src/components/EventCard.tsx)                            | A reusable component receiving one event through props. A router `Link` makes the whole card keyboard-accessible.                                      |
| [HomePage.tsx](../../client/src/pages/HomePage.tsx)                                   | State remembers search, category, page, results, loading, and errors. Changes trigger `useEffect`; `ignore` protects against out-of-order responses.   |
| [EventDetailPage.tsx](../../client/src/pages/EventDetailPage.tsx)                     | Reads the URL ID, fetches one event, and resets state on each request. Missing/invalid links are not clickable; cancelled/past events cannot register. |
| [App.tsx](../../client/src/App.tsx)                                                   | Connects `/events/:id` to the detail page and keeps the sticky navigation above page content.                                                          |
| [demoData.ts](../../server/src/db/demoData.ts)                                        | Named, typed demo objects instead of mixed string/number tuples. Explicit keys become stable UUIDs; all new listings are fictional samples.            |
| [seed.ts](../../server/src/db/seed.ts)                                                | Inserts clubs and upserts only seed-owned event IDs in one transaction. Re-running refreshes future dates without duplicating the new events.          |
| [event-discovery.test.ts](../../tests/event-discovery.test.ts)                        | Five database-free checks for formatting, registration links, fixture coverage, stable IDs, prices, and future dates.                                  |
| [Task checklist](aryan.md), this guide, and [PR description](aryan-pr-description.md) | Record what is complete, how it was checked, and how to review and submit it.                                                                          |
| [Screenshots](aryan-screenshots/)                                                     | Mobile and desktop UI evidence for the PR. These are after screenshots; no before screenshots were captured.                                           |

Purpose comments and comments at non-obvious decisions explain the source code.
Generated files and images do not contain code comments. JSON lockfiles must not
be hand-edited to add comments.

### Explain the request flow

1. Typing updates React state. Changing a filter also returns pagination to page one.
2. `useEffect` calls `listEvents` with the search, category, limit, and offset.
3. In live mode, it builds query parameters and calls `apiGet("/events?...")`.
4. The existing API helper adds `/api`. Vite forwards that request to Express.
5. **Naksh's code** validates the query, reads Neon, and returns typed JSON.
6. The page stores the response and renders `EventCard` components.
7. Clicking a card changes the URL. `useParams()` supplies the ID for `getEvent`.

The `ignore` flag does not cancel HTTP traffic. Cleanup sets it to `true` for the
old effect, preventing its later success/error handlers from changing current
state. Loading and error states also hide stale cards. Pagination is needed
because the backend does not return every event in a single default request.

The seed uses a transaction so inserts either all succeed or all roll back.
An upsert inserts an unknown ID or updates that same seed-owned ID. It does not
delete existing events. Do not renumber the demo keys when reordering the array.

## Corrections to the earlier implementation

- The earlier code bypassed the mock-data step and duplicated Naksh's backend.
  It now has a real frontend-only mode and uses the backend merged into main.
- The earlier seed had **23**, not 24, upcoming events, no arts/culture examples,
  no new clubs, and TypeScript errors caused by untyped tuples.
- The detail request did not reset old state and showed a Register control even
  without a URL. Both cases are now handled, along with cancellation and past events.
- The feed originally had no way to reach events beyond the first API page.
- [client/tsconfig.json](../../client/tsconfig.json) had only lost its final newline;
  formatting restored it. There is no remaining config change.
- The deleted public [server/.env.example](../../server/.env.example) was restored
  from Git. The private environment file was not opened or changed.
- The existing commit hook was not configured locally. `npm run prepare` enabled
  `.githooks` as required by the README. Never use `--no-verify`.
- [package-lock.json](../../package-lock.json) already had npm-generated metadata
  changes before this cleanup. They were preserved, not included in the intended
  feature scope. No dependency was added for this feature. Do not stage that file
  for this PR unless Tristan explicitly wants that separate npm normalization.

## Verification record

### Compatibility recheck: November 16, 2026

Verified with feature-branch `HEAD` equal to fetched `origin/main` at
`fbaf86e62cb96ed3d5f6da9283b2ed8ae8757fcd`, with Aryan's changes restored on top:

- Whole-project typecheck, production build, formatting, and all five automated
  event checks pass. The shared event response shape is compatible, so the event
  card and frontend data adapter needed no functional changes.
- All 12 headless browser check groups below pass again against live and mock
  modes. Mobile/desktop screenshots have been refreshed.
- Additional read-only API checks pass: blank filters are accepted, blank paging
  fields use defaults, a past `from` date cannot expose past events, and an invalid
  category returns 400. The two seed fixtures return `endsAt: null` as intended.
- The seed ran twice successfully on the previously confirmed personal Neon
  branch. There are 24 unique upcoming seed-owned events and nine clubs. The
  upcoming total is now 46, including 22 older rows; no older rows were deleted.
- There is no schema difference requiring another `db:push`. Main's auth,
  routing, shared validation/types, and API documentation are unchanged by Aryan.
- The backup stash is retained. The local `main` branch is unchanged, nothing was
  pushed, and feature changes remain uncommitted. No GitHub CI run or merge is
  implied by these local checks.

### Checks to repeat before submitting

Passed:

```bash
npm run typecheck
npm run build
npm run format:check
node --import tsx --test tests/event-discovery.test.ts
git diff --check
```

The headless Chrome smoke run passed 12 groups of checks:

- Mock UI with backend requests blocked; zero event API requests.
- All six categories and selected-button state.
- Case-insensitive trimmed search, combined filtering, empty state, clear filters.
- Feed layout at 320, 375, 390, 768, and 1440 pixels without horizontal overflow.
- Mock card/detail/back navigation, direct-link refresh, registration URL, missing link, invalid ID.
- Real API data and ordering: 24 unique seed-owned upcoming events, all categories,
  at least nine clubs, past/cancelled fixtures absent from the feed.
- Real pagination without repeated items, query parameters, page reset when filtering.
- Live registration target, cancellation/past restrictions, 404, and mobile detail layout.
- Simulated API failure: loading and error states, no stale cards, successful retry.
- Slow older search response cannot overwrite a newer empty response.
- Real Clubs page list and search.
- No uncaught browser JavaScript errors; screenshots captured.

On November 14 the database had **47 upcoming events**: 23 previous rows plus the
24 new demo rows. Previous rows were intentionally not deleted. A clean database
receives 24 upcoming demo events plus two past/cancelled fixtures (26 event rows).
Running the seed twice did not duplicate the 24 new upcoming rows.
The total can change as older events pass; the important seed check is 24 unique
upcoming seed-owned rows immediately after a fresh seed.

Registration URLs on new demo rows use `example.org` and are not real booking
links. Tests checked their destinations without submitting registrations.
RSVP space is a placeholder, not Rokyo's implementation.

### Run it yourself

Live mode (requires your private server environment file):

```bash
npm run dev
```

Frontend-only mock mode, on a separate port if live mode is already running:

```bash
VITE_USE_MOCK_EVENTS=true npm run dev -w client -- --port 5174 --strictPort
```

Visit `http://localhost:5173/` for live data or `http://localhost:5174/` for mocks.
Clubs always uses the real API; only event discovery has a mock source.
The `VITE_` flag is public configuration, not a secret. Never copy server secrets
into client environment variables.

To repeat the manual check: search by title/club/description, combine categories,
clear filters, paginate, open an event, check all detail fields, use Back, refresh
a detail URL, and test a nonexistent ID. In DevTools set the width to 375 pixels.
Confirm the terminal and browser console show no unexpected errors.

## When and how to open the PR

The backend dependency is merged. After Aryan reviews the diff and the current
verification results, commit and open a normal feature PR **targeting main**.
Only Tristan's reviewed PR merge should change main; do not push there directly.

1. Stay on the feature branch and review the intended files:

   ```bash
   git branch --show-current
   git status --short
   git diff origin/main -- client/src server/src/db/seed.ts docs/tasks
   ```

   Also open the untracked new files in the file table above; `git diff` alone does
   not show untracked content. The current branch name is safe to keep. The README
   recommends `aryan/what-it-does` for future task branches; no rename is required
   to avoid changes to `main`.

2. Stage only the intended files, not the entire working directory:

   ```bash
   git add client/src/App.tsx client/src/pages/HomePage.tsx client/src/pages/EventDetailPage.tsx
   git add client/src/components/EventCard.tsx client/src/data/mockEvents.ts
   git add client/src/lib/events.ts client/src/lib/eventDisplay.ts
   git add server/src/db/seed.ts server/src/db/demoData.ts tests/event-discovery.test.ts
   git add docs/tasks/aryan.md docs/tasks/aryan-implementation.md docs/tasks/aryan-pr-description.md docs/tasks/aryan-screenshots
   git diff --cached --stat
   git diff --cached
   git check-ignore server/.env
   git ls-files -- server/.env
   ```

   `check-ignore` should print the private file's path, and `ls-files` should print
   nothing for it. Never force-add secrets. Keep the unrelated lockfile change
   unstaged. Confirm no secret-bearing files are in the staged file list.

3. Commit. The existing hook formats staged files, typechecks, and builds:

   ```bash
   git commit -m "Add event discovery UI and demo data"
   ```

   Fix any failure and re-stage; never bypass the hook. Then follow the README's
   sync step **while staying on the feature branch**:

   ```bash
   git pull origin main
   npm run typecheck
   npm run build
   npm run format:check
   node --import tsx --test tests/event-discovery.test.ts
   ```

   If Git refuses because the unrelated lockfile is dirty, preserve it separately
   before syncing; do not reset the whole working tree. If there are conflicts
   with updated team work, resolve the intended code with Tristan rather than
   automatically choosing one side. Re-run the UI checks after an integration change.

4. Push only your feature branch:

   ```bash
   git push -u origin feature/aryan-event-discovery
   ```
