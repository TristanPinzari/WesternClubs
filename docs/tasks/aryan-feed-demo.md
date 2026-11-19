<!--
  WHAT: A concrete feed demo and verification runbook using the existing demo accounts.
  WITHOUT IT: The presenter would have to guess which events rank first and how to
    demonstrate RSVP privacy without other ranking signals masking the result.
-->

# Feed demo plan for Tristan review

**Prepared November 19, 2026; awaiting Tristan's review.** This is a proposed
walkthrough with expected results, not a record of completed coordination or
hosted rehearsal. Automated verification is recorded separately below. It targets the local feature work after main
`3f62f04` was merged at `9deb823`. No accounts were created, seeds executed,
credentials published, or contact made with Tristan while preparing this plan.

Sources: [existing demo accounts](../../server/src/db/seedDemoUsers.ts),
[demo event definitions](../../server/src/db/demoData.ts), and
[the feed contract](../API.md#for-you-feed). Task H belongs to
[Naksh](naksh.md); Aryan owns the feed walkthrough and rehearsal.

## Accounts and preflight

Use the existing presentation environment in live API mode, with credentials
already provided through the team's private channel. This document lists emails
only. Do not sign up new accounts, edit environment files, or run seeds for this
walkthrough. If an account or fixture is missing, record that setup gap for
Naksh/Tristan before rehearsing.

| Role in the demo                         | Existing account           | Seeded state relevant to Jordan's feed                                                                                   |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Viewer A: Jordan Lee                     | `orbit.demo.jordan@uwo.ca` | Follows Western Board Games Club and Western Outdoors Club; follows Priya, Sam, Alex; interests `social`, `arts_culture` |
| Actor B: Alex Martin                     | `orbit.demo.alex@uwo.ca`   | Public profile; public Going on events 1, 7; public Interested on events 9, 13                                           |
| Background social signal: Priya Shah     | `orbit.demo.priya@uwo.ca`  | Public Going on 4, 6, 12; public Interested on 18                                                                        |
| Background social signal: Sam Okafor     | `orbit.demo.sam@uwo.ca`    | Public Going on 3, 11; public Interested on 15; anonymous Going on 4                                                     |
| Background privacy example: Riley Nguyen | `orbit.demo.riley@uwo.ca`  | Private profile; Going on 1 and Interested on 4, excluded from public attendee lists                                     |
| Optional exec handoff: Maya Patel        | `orbit.demo.exec@uwo.ca`   | Intended Western AI owner; verify current ownership before any separate exec demo                                        |

Open two isolated browser sessions (separate profiles, or normal plus private
window), A as Jordan and B as Alex. Two ordinary tabs share the same session and
are not sufficient. Keep passwords and sign-in screens out of any recording.

Before the walkthrough, verify the existing state rather than assuming a seed
has just run:

1. In A, use `/me/following` and `/me/profile` to check Jordan's clubs, people,
   and interests against the table. Keep these unchanged except the planned
   Alex follow/unfollow steps.
2. In B, check `/me/profile` is public, `/me/followers` has Jordan and does not
   list Jordan under Blocked, and Alex's four RSVPs match the table. The demo
   account seed does **not** clear existing blocks; prior rehearsals can leave
   them behind. Priya or Sam blocking Jordan also invalidates the baseline.
3. Check the 24 demo events are still upcoming and not cancelled. Their dates
   are relative to the last event seed, at 22:00 UTC, with event key N scheduled
   N days later. These are fictional sample events, not live registrations.
4. Open `/?tab=for-you` in A and wait for loading to finish. Refresh A after each
   action in B; changes made in another session do not automatically refresh the
   currently displayed feed.

The seeds preserve unrelated events. The groups below give the **exact relative
order of the 24 eligible seed events under unchanged seeded activity**. Other
events can interleave and change totals, global positions, and page boundaries.
Do not delete unrelated data to force the expected count. Record any differences
before using the plan on stage.

## Expected opening order and narration

Each event uses its highest matching score, then sorts by start time and ID.
Numbers below are stable event keys from the source, not ranks or database IDs.

| Score / reason      | Events in exact order                                                                                                                                                                                                                                                                                                                                                                               | Why Jordan sees them here                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3 / `followed_club` | **4** Cooperative Board Game Night → **5** Thames Valley Trail Walk → **10** Campus Trivia and Snacks → **16** Hot Chocolate and Adventure Stories → **17** Indoor Climbing Taster → **22** Puzzle Night and Tea                                                                                                                                                                                    | Jordan follows Board Games and Outdoors. Club ranking wins over any RSVP or interest match.                                                                    |
| 2 / `followed_user` | **1** Build Your First AI Study Tool → **3** Careers in Finance Coffee Chat → **6** Watercolour and Conversation → **7** Student Web Projects Build Night → **9** Meet Your Next Project Teammate → **11** Beginner Run and Walk Meetup → **12** Student Acoustic Open Mic → **13** Introduction to Data Visualisation → **15** Case Competition Team Mixer → **18** Campus Architecture Photo Walk | Public Going and Interested RSVPs from Alex, Sam, and Priya qualify. All these cards say exactly **People you follow are going**, with no attendee identities. |
| 1 / `interest`      | **24** Collage and Zine Workshop                                                                                                                                                                                                                                                                                                                                                                    | Matches Jordan's `arts_culture` interest without a higher matching score.                                                                                      |
| 0 / `null`          | **2** Calculus Practice Circle → **8** Biology Revision Workshop → **14** Student Budgeting Workshop → **19** Responsible AI Discussion Lab → **20** Research Poster Practice Session → **21** Creative Collaborators Meetup → **23** Indoor Stretch and Mobility                                                                                                                                   | No club, eligible followed-person RSVP, or interest match for Jordan.                                                                                          |

If these are the only 24 eligible events, the 12-card pages are:

- Page 1, `/?tab=for-you&page=1`: **4, 5, 10, 16, 17, 22, 1, 3, 6, 7, 9, 11**.
- Page 2, `/?tab=for-you&page=2`: **12, 13, 15, 18, 24, 2, 8, 14, 19, 20, 21, 23**.

Suggested opening: "Jordan sees clubs they follow first, then events with public
RSVPs from people they follow, then their interests. Each event appears once.
The social card label is generic; names only appear on eligible attendee lists."
Switch briefly to All events to show chronological discovery, then back to For
you. With only the 24 fixtures, All events orders them **1 through 24**.

## Two-account follow and privacy walkthrough

Use event **9, Meet Your Next Project Teammate**, at
`/events/a7a10000-0000-4000-8000-000000000009`. It is a Western AI networking
event: Jordan follows neither that club nor that category. Alex's seeded RSVP
is public **Interested**, so it proves Interested qualifies for score 2.

Expected groups after each controlled change (all other seeded state unchanged):

| State                                                           | Score 3              | Score 2                           | Score 1 | Score 0                               |
| --------------------------------------------------------------- | -------------------- | --------------------------------- | ------- | ------------------------------------- |
| Baseline: Alex public, followed, RSVPs visible                  | 4, 5, 10, 16, 17, 22 | 1, 3, 6, 7, 9, 11, 12, 13, 15, 18 | 24      | 2, 8, 14, 19, 20, 21, 23              |
| Jordan unfollows Alex, Alex goes private, or Alex blocks Jordan | 4, 5, 10, 16, 17, 22 | 3, 6, 11, 12, 15, 18              | 24      | 1, 2, 7, 8, 9, 13, 14, 19, 20, 21, 23 |
| Only Alex's event 9 RSVP becomes anonymous                      | 4, 5, 10, 16, 17, 22 | 1, 3, 6, 7, 11, 12, 13, 15, 18    | 24      | 2, 8, 9, 14, 19, 20, 21, 23           |

1. **Show the follow effect.** In A, unfollow Alex from `/me/following`. Reload
   For you and compare with the second row: Alex's events 1, 7, 9, 13 lose their
   social reason. Find Alex through People and follow again. Reload For you;
   those events return to score 2, with the exact generic label above.
2. **Show both statuses.** In B, open event 9. Confirm Interested is selected
   and the RSVP is on the attendee list. A should see the social reason. In B,
   choose **Change**, select **Going**, leave **Show me on the attendee list**
   on, and confirm. Refresh A: the reason and ranking stay the same. Restore
   **Interested**, confirm, and refresh A before the next step.
3. **Show anonymity.** In B, choose Change on event 9, turn **Show me on the
   attendee list** off, and confirm. Refresh A's feed and the event detail.
   Event 9 loses the social reason and moves into score 0 (third row), and Alex
   disappears from its attendee list. The Interested count still includes the
   anonymous RSVP. Alex's other public RSVPs still promote events 1, 7, 13.
   Turn the toggle back on and confirm in B; refresh A to restore the baseline.
4. **Show profile privacy.** In B, open `/me/profile`, uncheck **Public profile**,
   and **Save profile**. Refresh A: all four Alex events lose their social
   contribution (second row), Alex is absent from attendee lists and People,
   and Jordan no longer follows Alex. RSVP counts still include Alex's RSVPs.
   Save Alex as public again. **This does not restore Jordan's follow.** In A,
   find Alex and follow again, then refresh to restore the baseline.
5. **Show the correct block direction.** In B, open `/me/followers`, block Jordan,
   and confirm. This is **Alex blocking Jordan**, the viewer of Alex's activity.
   Refresh A: the second row applies, Alex cannot be found/followed, and Alex
   disappears from attendee lists. No message tells Jordan they were blocked.
   In B, use **Unblock** in the Blocked section. In A, explicitly follow Alex
   again and reload; unblocking alone does not restore a follow.

These are expected results to record during rehearsal. An event loses only the
disqualified person's contribution; it remains visible as an upcoming event and
can still qualify through another followed person.

**Why other fixtures can mislead:** event 4 stays at score 3 because Jordan
follows Board Games, even though Sam is anonymous there. Priya also has a public
RSVP on it. Events 6, 12, 18 fall only to Jordan's interest score 1 if Priya's
social contribution disappears. Club and interest ranking can therefore mask
the apparent drop. Use Alex's event 9 and inspect the reason as well as position.

## URL and return-navigation checks

Run these as Jordan after restoring the baseline. These are manual checks still
to perform, not passing results. Parameter ordering is not significant; absent
`page` means page 1, absent `tab` means All events, and the UI can omit default
parameters.

| Action / URL                                                                  | Expected result                                                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open `/?tab=all&q=workshop&category=arts_culture&page=1`, then refresh        | Search reads `workshop`, Arts & culture is selected, All events is selected. Among the seed events, only 24 (Collage and Zine Workshop) matches.                                                      |
| Open that card, use **Back to events**, then repeat with browser Back/Forward | The originating `q`, `category`, page, and tab are preserved; return to the same filtered list.                                                                                                       |
| Open `/?tab=all&page=2`, open a card, then use **Back to events**             | Return to page 2. With only the 24 fixtures, this page contains 13–24. Confirm refresh keeps page 2.                                                                                                  |
| Open `/?tab=for-you&page=2`, open a card, then use **Back to events**         | Return to the second personalized page, with its query intact. API paging uses `limit=12&offset=12`; the browser's page number is one-based.                                                          |
| From All events page 2, type a search or select a category                    | URL and results reset to page 1 after the debounced search; no stale later page remains selected.                                                                                                     |
| Switch from filtered All events to For you and back                           | URL uses `tab=for-you` / `tab=all`; switching resets page 1. Search/category values are retained, but do not filter For you (`GET /api/feed` takes `limit`/`offset`). They apply again on All events. |
| Navigate between pages or categories, then use browser Back/Forward           | Controls and results follow the URL. Search typing replaces history entries, so Back need not step through individual keystrokes.                                                                     |
| Open `/?tab=all&page=0`, then `/?tab=all&page=banana`                         | Render page 1 safely; rewriting the invalid URL is not required.                                                                                                                                      |
| Open a copied event detail URL in a new tab with no navigation state          | **Back to events** returns to `/`; a standalone detail URL does not encode the original feed filters.                                                                                                 |
| Sign out of A and open `/?tab=for-you&page=1`                                 | Public All events is shown, no personalized results or For you tab; `GET /api/feed` requires authentication.                                                                                          |

## Restore state and record pending checks

At the end of rehearsal, restore Alex to a public profile with no block on
Jordan. Jordan must follow Alex again. Alex's RSVPs should be Going on 1 and 7,
Interested on 9 and 13, all visible. Leave Jordan's two club follows, three person
follows, and two interests at their seeded values. Check any pre-existing
differences before changing unrelated activity; a seed rerun is not a substitute
for this cleanup.

- [ ] Verify environment/account availability and capture actual feed order,
      noting any unrelated, expired, cancelled, or changed events.
- [ ] Complete the two-account steps and URL checks, recording observed results
      and restoring the original demo state.
- [x] Isolated production SQL verified the edge cases: no profile row still qualifies via
      LEFT JOIN; an RSVP user who blocked the viewer is excluded even if a follow
      row remains. Every seeded account has a profile, and normal privacy/block
      actions remove follows, so this manual walkthrough cannot isolate those cases.
- [x] Typecheck, production build, 24 isolated SQL/unit tests, and browser
      regressions pass. SQL checks cover ranking, privacy, and paging; browser checks
      intercept APIs, so they do not certify hosted authentication or database setup.
- [ ] Tristan reviews the plan and selects the on-stage sequence after rehearsal.
      Preparation and automated checks are complete; review and live rehearsal remain pending.

## Repeat the automated checks without touching the configured database

Run from the repository root with Node and Google Chrome installed. The tools are
installed into a temporary directory; project dependencies and `.env` are unchanged.
The SQL suite builds an in-memory PostgreSQL database from the actual Drizzle
schema and executes the production feed query. The browser suite intercepts all
API traffic, including the simulated settings writes.

```bash
orbit_test_tools=$(mktemp -d)
npm install --prefix "$orbit_test_tools" --no-save --package-lock=false @electric-sql/pglite@0.5.16 playwright@1.65.1
PGLITE_MODULE_PATH="$orbit_test_tools/node_modules/@electric-sql/pglite/dist/index.js" node --import tsx --test tests/feed-query.test.ts tests/club-exec.test.ts tests/event-discovery.test.ts
npm run typecheck
npm run build
```

In a separate terminal, start the ordinary frontend (not mock mode):

```bash
npm run dev --workspace client -- --host 127.0.0.1 --port 5185 --strictPort
```

Then, in the terminal holding `orbit_test_tools`:

```bash
node tests/feed-browser.mjs "$orbit_test_tools/node_modules/playwright/index.mjs"
```

Stop the temporary frontend with Ctrl+C afterwards. The browser checks cover
URL/history/debounce races, session privacy, empty/out-of-range pages, generic
reason labels, and preserved settings forms/messages/drafts/permissions after
saves and ownership transfers. The opt-in [live suite](../../tests/aryan-live.mjs)
also contains real two-account RSVP/privacy transitions, but was not run against
the hosted database during this change.
