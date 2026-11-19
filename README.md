<!--
  WHAT: The project's front page on GitHub: what Orbit is, the stack, how to set it up,
    and how the team works.
  WITHOUT IT: New teammates (and judges) would have no starting point.
-->

# Orbit — Discover Events. Find Your People.

**A campus event discovery and social networking platform built for Western University students.**

Orbit helps students discover events happening around campus, explore new opportunities, and connect with others who share similar interests.

## About the Project

Western University offers various opportunities to get involved, from academic workshops and networking events to club socials, sporting events, and competitions.

However, information about these events are often scattered across different platforms, such as Instagram pages, Bounce, Flite, Rubric, university websites, and individual club pages.

This makes it difficult for students to discover events, stay informed, and get involved in campus life.

**Orbit aims to solve this problem by bringing campus events and student connections together in one centralized platform.**

Events on Orbit are posted directly by club executives through their club's page, so listings come straight from the organizers rather than being scraped from other platforms.

Beyond discovering events, students can see who else is planning to attend, explore student profiles, and connect with people who have similar interests.

The goal is to help students discover events and find their people.

## Key Features

### Event Discovery

- Browse upcoming events hosted by university clubs, organizations, and affiliates.
- Search for events by name, organization, or keyword.
- Filter events through categories such as:
  - Academic
  - Social
  - Networking
  - Sports & Recreation
  - Technology
  - Arts & Culture
- View key event details at a glance, including date, time, location, price, description, and eligibility requirements.
- Access direct links to official registration pages and event organizers.

### Clubs & Organizations

- Club executives can create a club page with a description, logo, and social links.
- Post, edit, and cancel events under the club's name.
- Clubs can have multiple executives with role-based permissions:
  - **Owner:** full control, including deleting the club and transferring ownership.
  - **Admin:** manage club details, members, and roles.
  - **Editor:** create and manage events.
- Transfer ownership to another executive, supporting year-to-year leadership handoffs.
- Add or remove executives as club leadership changes.
- Students can follow clubs to see their upcoming events.

### Accounts & Verification

- Sign-up is restricted to Western University students with a valid `@uwo.ca` email address.
- For the hackathon, this is a domain check only. Verifying that you actually own the address (an emailed code or link) is a future improvement.
- A quick onboarding step after sign-up: pick your interests and follow a few clubs, so your feed is personalized from the start.

### Personalized Event Management

- A **"For you" feed** that puts events first from clubs you follow, then events people you follow are going to, then events matching your interests.
- Mark events as "Interested" or "Going."
- View upcoming events in a personal dashboard.
- Keep track of events you plan to attend.
- Save events for later (lower priority).

### Student Profiles

- Create a personal profile with a profile picture.
- Add information such as program, year of study, interests (chosen from a fixed list), and a short bio.
- Include optional links to external social profiles.
- Make your profile public or private. Private profiles can't be viewed or followed by others.

### Following

- Follow clubs and other students. Following is one-way and needs no approval.
- Find people on the **People** page: search by name or program, browse everyone with a public profile, or follow suggested students who share your interests. Private profiles never appear.
- Events from clubs and people you follow appear higher in your feed.
- **No follower counts, and nobody can see anyone else's followers.** Orbit is for finding events and people, not for comparing popularity.
- **See who follows you, and silently block anyone.** Only you can see your own followers. Blocking someone hides you from them everywhere (profile, search, attendee lists), and to them you just look like a private profile.

### Meeting People at Events

- When you RSVP, you appear on the event's attendee list by default, so others can see who's going. You can **RSVP anonymously** instead by switching that off.
- See who else is going, and view their public profiles.
- Indicate your purpose for attending, such as meeting new people, professional networking, or finding teammates.
- Optionally indicate that you're looking for someone to attend an event with.

## How It Works

1. **Discover:** Browse campus events, or check your "For you" feed.
2. **Explore:** View event information, organizers, and registration links.
3. **Plan:** Mark yourself as interested or going, on the attendee list or anonymously.
4. **Connect:** See who else is going, and follow clubs and people you want to keep up with.
5. **Engage:** Meet new people and participate in campus opportunities.

## Technology Stack

| Component      | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Language       | TypeScript (frontend and backend)                    |
| Frontend       | React + Vite, Tailwind CSS                           |
| Backend        | Node.js + Express                                    |
| Database       | PostgreSQL (hosted on Neon)                          |
| ORM            | Drizzle ORM                                          |
| Validation     | Zod                                                  |
| Authentication | Better Auth (sign-up restricted to `@uwo.ca` emails) |
| Media Storage  | AWS S3 (uploads via presigned URLs)                  |
| Hosting        | Vercel (frontend), Railway (backend)                 |

### Why this stack

**Chosen for a specific reason:**

- **Express as a separate backend (instead of Next.js).** If Orbit went to production, it would almost certainly get a mobile app. With a standalone Express API, the web app and a future mobile app call the exact same endpoints, so nothing has to be rebuilt. With Next.js, much of the logic would likely end up in Server Actions, which only work from Next.js pages. A mobile app can't call them, so we'd have to rebuild that logic as API routes later. Keeping the backend separate also gives us a clear split between frontend and backend work.
- **PostgreSQL (instead of a document database like MongoDB).** Orbit's data is highly relational: users belong to clubs with roles, clubs post events, users RSVP to events, follow clubs, and connect with each other. Relational databases model this naturally, and constraints such as "one owner per club" or "one RSVP per user per event" can be enforced by the database itself.
- **TypeScript everywhere, with a shared package.** The client and server share the same types and validation rules (`shared/`). If the API changes shape, the frontend fails to compile instead of breaking at runtime. That safety net matters for a team with mixed experience.
- **Better Auth.** Handles password hashing, sessions, and cookies for us instead of us writing (and getting wrong) our own auth. It stores users in our own Postgres database, so we keep full control of user data, and it supports mobile clients if we build one.
- **Zod.** Validates every request at the API boundary, so bad input is rejected with a clear error before it reaches the database.
- **S3 with presigned uploads.** Images upload directly from the browser to S3 instead of passing through our server, which keeps the backend fast and simple. S3 is also the industry standard for file storage.
- **One domain for frontend and backend.** Vercel forwards `/api/*` to the Express backend on Railway, so the browser only ever talks to one origin. This avoids cross-site cookie problems with authentication.

**Mostly preference (alternatives would work just as well):**

- **React + Vite.** React is the most widely used UI library and what the team knows. Vite gives a fast dev server with no framework lock-in.
- **Tailwind CSS.** A quick way to build mobile-friendly layouts without writing separate CSS files.
- **Drizzle ORM.** Prisma would also work. We picked Drizzle because it reads close to real SQL, which is better for learning.
- **Neon.** Hosted Postgres with a free tier, and per-person database branches so teammates don't break each other's schemas. Supabase or Railway's Postgres would also work.
- **Vercel and Railway.** Free or cheap hosting with easy GitHub deploys. Netlify, Render, or Fly.io would be fine too.

## Project Structure

```
orbit/
├── client/                 React + Vite frontend (deployed to Vercel)
│   ├── src/pages/          One file per page. ClubsPage.tsx is the example to copy
│   ├── src/lib/api.ts      fetch helper for calling the backend
│   ├── src/lib/auth-client.ts   Better Auth client (sign up / sign in / session)
│   └── vercel.json         Forwards /api/* to the Railway backend
├── server/                 Express backend (deployed to Railway)
│   ├── src/index.ts        App entry: mounts auth + routers
│   ├── src/routes/         One router per resource. clubs.ts is the example to copy
│   ├── src/middleware.ts   requireAuth, error handling (requireClubRole is TODO)
│   ├── src/auth.ts         Better Auth config
│   └── src/db/             Drizzle schema, DB connection, seed script
├── shared/                 Enums, Zod schemas, and types used by both client and server
└── docs/
    ├── HOW-IT-WORKS.md     Start here: how a request flows through the app, plus a glossary
    ├── API.md              Every endpoint, who can call it, and what's done
    └── tasks/              Each team member's task list
```

**New to this kind of project? Read [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md) first.** It walks through one real request from the browser to the database and back.

Look for `EXAMPLE` comments for patterns to copy and `TODO` comments for work to pick up. `TODO(advanced)` marks the trickier bits, which are worth researching or asking about.

Every file starts with a `WHAT` / `WITHOUT IT` comment explaining its purpose. JSON files can't contain comments, so those are explained here:

| File                                                                | What it's for                                                                                                                | Without it                                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `package.json` (root)                                               | Declares the three workspaces (`client`, `server`, `shared`), the shared dev tools, and the root commands like `npm run dev` | `npm install` wouldn't install the packages together, and none of the root commands would exist         |
| `client/package.json`, `server/package.json`, `shared/package.json` | Each package's name, dependencies, and its own scripts (e.g. the server's `dev` and `db:push`)                               | That package's dependencies wouldn't install, and `@orbit/shared` couldn't be imported                  |
| `package-lock.json`                                                 | Records the exact version of every installed package. Generated by npm, never edited by hand                                 | Everyone (and CI) could end up with slightly different versions, causing "works on my machine" bugs     |
| `client/vercel.json`                                                | Tells Vercel to forward `/api/*` to the Railway backend and send every other URL to the React app                            | In production, API calls would 404, and refreshing any page other than `/` would show Vercel's 404 page |

## Getting Started

**Prerequisites:** Node.js 22+, a free [Neon](https://neon.tech) account, and [VS Code](https://code.visualstudio.com) (recommended).

1. **Install dependencies** (from the repo root; this installs everything):
   ```bash
   npm install
   ```
   When you open the repo in VS Code, accept the popup to install the **recommended extensions** (Prettier and Tailwind CSS IntelliSense).
2. **Create your database.** In Neon, create a **branch** of the project for yourself (so your schema changes don't break anyone else's) and copy its connection string.
3. **Set up your env file.** Ask Tristan for the team's `.env` file (it's shared privately and never committed). Put it at `server/.env`, then replace `DATABASE_URL` with **your own** Neon branch's connection string. `server/.env.example` lists every variable, for reference.
4. **Create the tables and add demo data:**
   ```bash
   npm run db:push
   npm run db:seed
   npm run db:seed:demo   # demo accounts: needs DEMO_PASSWORD in server/.env (see below)
   ```
5. **Run the app:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 and check the **Clubs** tab, which works end to end.

### Demo accounts

`npm run db:seed:demo` creates these fictional accounts. They all use the password in `DEMO_PASSWORD` (ask Tristan; it's never committed). It's safe to run again: it resets their profiles, club roles, follows, and RSVPs to the seed values, so re-run it between demo rehearsals. Clubs and events created live during a rehearsal are not removed; delete those in `npm run db:studio` if needed.

| Email                      | Who                             | Use it to show                                                     |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `orbit.demo.exec@uwo.ca`   | Maya Patel, owner of Western AI | Posting and editing events, club settings, managing execs          |
| `orbit.demo.jordan@uwo.ca` | Jordan Lee, student             | **The main demo account:** "For you" feed, following, RSVPs, `/me` |
| `orbit.demo.priya@uwo.ca`  | Priya Shah, student             | A public profile with several RSVPs                                |
| `orbit.demo.sam@uwo.ca`    | Sam Okafor, student             | An anonymous RSVP (Cooperative Board Game Night)                   |
| `orbit.demo.alex@uwo.ca`   | Alex Martin, student            | A first-year looking for teammates                                 |
| `orbit.demo.riley@uwo.ca`  | Riley Nguyen, student           | A **private** profile: never on attendee lists, can't be followed  |

Privacy check for the demo: "Build Your First AI Study Tool" and "Cooperative Board Game Night" each have RSVPs from Riley (private) or Sam (anonymous). They're counted, but their names never appear on the attendee list.

### Useful commands

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Runs the frontend (port 5173) and backend (port 3000) together      |
| `npm run db:push`      | Applies changes from `server/src/db/schema.ts` to your database     |
| `npm run db:seed`      | Inserts demo data                                                   |
| `npm run db:seed:demo` | Creates the demo accounts, follows, and RSVPs (run after `db:seed`) |
| `npm run db:studio`    | Opens a browser UI for viewing and editing your database            |
| `npm run typecheck`    | Checks the whole project for TypeScript errors                      |
| `npm run format`       | Formats every file with Prettier                                    |

### Deployment

- **Railway (backend):** deploy from the repo root, with start command `npm run start -w server`. Set the same variables as `server/.env`, with `APP_URL` set to the Vercel URL.
- **Vercel (frontend):** set the root directory to `client`, and put the Railway URL into `client/vercel.json`.

### Troubleshooting

| Problem                                                               | Fix                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot find module ...` (often right after `git pull`)               | Someone added a dependency. Run `npm install`.                                                                                                                                                          |
| `The server can't start because server/.env is missing or incomplete` | Your `server/.env` is missing or lacks the listed settings. See Getting Started, step 3. Make sure the file is in `server/`, not the repo root.                                                         |
| `DATABASE_URL is missing` when running `db:push` or `db:studio`       | Same as above: put your Neon branch's connection string in `server/.env`.                                                                                                                               |
| `column "..." does not exist` or `relation "..." does not exist`      | The schema changed but your database didn't. Run `npm run db:push`.                                                                                                                                     |
| `EADDRINUSE: address already in use :::3000` (or `5173`)              | Another copy of the app is still running. Stop it (Ctrl+C in its terminal) or close the old terminal, then run `npm run dev` again.                                                                     |
| The page shows an error, or data doesn't load                         | Open DevTools → **Network**, click the failing `/api/...` request, and read the response. Then check the terminal running `npm run dev` for a backend error. See "Debugging" in `docs/HOW-IT-WORKS.md`. |
| Signing in works, but you seem signed out right after                 | Open the app at `http://localhost:5173`, **not** `localhost:3000`. Cookies only work through the frontend address.                                                                                      |
| The commit was cancelled by the pre-commit hook                       | Read the output: it's a TypeScript or build error. Fix it, `git add`, and commit again.                                                                                                                 |
| VS Code doesn't format on save                                        | Install the Prettier extension (VS Code should prompt you), then reload the window.                                                                                                                     |

## Git Workflow

Everyone works on their own branch, and changes reach `main` only through a pull request.

1. **Start from the latest `main`:**
   ```bash
   git checkout main
   git pull
   ```
2. **Create a branch for your task**, named `yourname/what-it-does`:
   ```bash
   git checkout -b naksh/events-api
   ```
3. **Commit as you go**, in small steps with clear messages:
   ```bash
   git add <files>
   git commit -m "Add event table and GET /api/events"
   ```
4. **Before opening a PR**, bring in the latest `main` and make sure everything still compiles:
   ```bash
   git pull origin main
   npm run typecheck
   ```
5. **Push and open a pull request** on GitHub:
   ```bash
   git push -u origin naksh/events-api
   ```
   Tristan reviews and merges it. Be ready to explain your changes.

**Rules:**

- **Never push directly to `main`.**
- **Never commit `.env`** or any keys or passwords. `.gitignore` already excludes `.env`, so don't force-add it.
- **Merge conflicts** happen when two people edit the same lines. Git marks both versions in the file with `<<<<<<<` and `>>>>>>>`. Keep the right code, delete the markers, then commit. If you're unsure, ask before resolving.
- **Schema changes:** after pulling, run `npm run db:push` if `server/src/db/schema.ts` changed. Tell the team in the group chat when you change it.
- **New dependencies:** after pulling, run `npm install` if `package-lock.json` changed.
- **Pre-commit check:** every commit automatically formats the files you're committing with Prettier, then runs the typecheck and client build. If the typecheck or build fails, the commit is cancelled. Fix the errors and commit again. Don't skip it with `--no-verify`. If you stage only part of a file, the hook re-stages the whole file after formatting. The hook is set up automatically by `npm install`.

## Development Roadmap

### Phase 1 — Core Platform

- [ ] Initialize project and configure development environment
- [ ] Design user interface and navigation
- [ ] Implement user authentication restricted to `@uwo.ca` emails
- [ ] Implement club creation and club pages
- [ ] Allow club executives to post events under their club
- [ ] Implement event listings and event details
- [ ] Add event search and filtering

### Phase 2 — Social Features

- [ ] Implement club roles and permissions (Owner, Admin, Editor)
- [ ] Implement club ownership transfer
- [ ] Club exec pages: create a club, club settings, post/edit/cancel events, manage execs
- [ ] Allow students to follow clubs and other students
- [ ] Implement student profiles, profile pictures, and image uploads
- [ ] Onboarding: pick interests and follow clubs after sign-up
- [ ] Add "Interested" and "Going" event statuses (with an option to RSVP anonymously)
- [ ] Display event attendee lists
- [ ] "For you" feed ranked by follows and interests
- [ ] Create a personal event dashboard

### Phase 3 — Testing and Deployment

- [ ] Connect frontend and backend
- [ ] Implement profile visibility and data-access controls
- [ ] Test core functionality
- [ ] Optimize for mobile devices
- [ ] Deploy the application
- [ ] Prepare final project demonstration

## Future Improvements

Potential features beyond the initial hackathon include:

- AI-powered personalized event recommendations.
- Natural-language event search.
- AI-assisted event information extraction.
- Event recommendations based on a student's interests and goals.
- Calendar integration and event reminders.
- Additional networking and community-building features.
- Email verification, to prove students own their `@uwo.ca` address.
- Club verification and limits on club creation, to stop people impersonating clubs or reserving popular names.
- Letting club owners choose a custom URL (slug) for their club page.
- Moderation tools: reporting and blocking.
- Support for additional universities.

## Team

Developed by a team of Western University students participating in the **Xcelerate Hackathon**.

| Name    | Role                                                                          |
| ------- | ----------------------------------------------------------------------------- |
| Tristan | Team lead, mentor, code reviewer, and pitch                                   |
| Naksh   | Backend: auth, permissions, uploads, following, and profiles API              |
| Aryan   | Frontend: event discovery, club exec pages, the "For you" feed, and demo data |
| Rokyo   | Full stack: sign-in, RSVPs and attendee lists, profiles, and onboarding       |

Each member's task list is in [`docs/tasks/`](docs/tasks/).

## Our Mission

We believe university is about more than attending classes. It's about discovering opportunities, building meaningful connections, and becoming part of a community.

Orbit makes it easier for students to get involved, discover new experiences, and connect with the people around them.

**Discover events. Find your people.**
