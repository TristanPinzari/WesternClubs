// WHAT: Creates the demo accounts and their social activity: one club exec, five
//   students with profiles, follows, and RSVPs on the demo events.
// WITHOUT IT: The "For you" feed and attendee lists would be empty during the demo.
//
// Run AFTER `npm run db:seed` (it uses those clubs and events):
//   DEMO_PASSWORD=... npm run db:seed:demo
// (or put DEMO_PASSWORD in server/.env). Every account uses that password. Never
// commit it: these accounts also exist on the deployed site.
//
// Safe to run twice: existing accounts are reused, and their profiles, roles, follows,
// and RSVPs are reset to exactly the values below (handy between demo rehearsals).
// Clubs and events created live during a rehearsal are NOT removed.
import type {
  AttendancePurpose,
  EventCategory,
  RsvpStatus,
} from "@orbit/shared";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "../auth";
import { demoClubs, demoEventId } from "./demoData";
import { db } from "./index";
import {
  club,
  clubFollow,
  clubMember,
  eventRsvp,
  profile,
  user,
  userFollow,
} from "./schema";

type ClubSlug = (typeof demoClubs)[number]["slug"];

type DemoRsvp = {
  event: number; // a demoEvents key from demoData.ts
  status: RsvpStatus;
  anonymous?: boolean; // true = counted, but never named on the attendee list
  purpose?: AttendancePurpose;
};

type DemoAccount = {
  key: string;
  name: string;
  program: string;
  yearOfStudy: number;
  bio: string;
  interests: EventCategory[];
  isPublic: boolean;
  owns?: ClubSlug; // the exec account
  followsClubs: ClubSlug[];
  followsPeople: string[]; // other accounts' keys
  rsvps: DemoRsvp[];
};

// Fictional people. The story for the demo:
// - Sign in as the EXEC to post an event for Western AI.
// - Sign in as JORDAN to show "For you": Jordan follows two clubs, follows Priya,
//   Sam, and Alex (who have RSVPs), and has interests that match other events.
// - Event 1 ("Build Your First AI Study Tool") and event 4 ("Cooperative Board Game
//   Night") show the privacy rules: Riley's profile is private and Sam RSVP'd
//   anonymously, so both are counted but never named.
const ACCOUNTS: DemoAccount[] = [
  {
    key: "exec",
    name: "Maya Patel",
    program: "Computer Science",
    yearOfStudy: 4,
    bio: "President of Western AI (demo account).",
    interests: ["technology", "networking"],
    isPublic: true,
    owns: "western-ai",
    followsClubs: ["western-science-society"],
    followsPeople: [],
    rsvps: [{ event: 1, status: "going", purpose: "meet_people" }],
  },
  {
    key: "jordan",
    name: "Jordan Lee",
    program: "Health Sciences",
    yearOfStudy: 2,
    bio: "Looking for things to do on campus (demo account).",
    interests: ["social", "arts_culture"],
    isPublic: true,
    followsClubs: ["western-board-games", "western-outdoors-club"],
    followsPeople: ["priya", "sam", "alex"],
    rsvps: [{ event: 10, status: "going" }],
  },
  {
    key: "priya",
    name: "Priya Shah",
    program: "Visual Arts",
    yearOfStudy: 3,
    bio: "Painter, zine maker, and open mic regular (demo account).",
    interests: ["arts_culture", "academic"],
    isPublic: true,
    followsClubs: ["western-art-collective", "western-music-circle"],
    followsPeople: ["jordan"],
    rsvps: [
      { event: 4, status: "going", purpose: "meet_people" },
      { event: 6, status: "going" },
      { event: 12, status: "going", purpose: "just_attending" },
      { event: 18, status: "interested" },
    ],
  },
  {
    key: "sam",
    name: "Sam Okafor",
    program: "Business (Ivey HBA)",
    yearOfStudy: 2,
    bio: "Runner and future analyst (demo account).",
    interests: ["sports_recreation", "networking"],
    isPublic: true,
    followsClubs: ["western-social-runners", "western-finance-association"],
    followsPeople: ["priya"],
    rsvps: [
      { event: 3, status: "going", purpose: "networking" },
      { event: 4, status: "going", anonymous: true },
      { event: 11, status: "going" },
      { event: 15, status: "interested", purpose: "find_teammates" },
    ],
  },
  {
    key: "alex",
    name: "Alex Martin",
    program: "Software Engineering",
    yearOfStudy: 1,
    bio: "First year, here to build things (demo account).",
    interests: ["technology", "academic"],
    isPublic: true,
    followsClubs: ["western-ai"],
    followsPeople: ["exec"],
    rsvps: [
      { event: 1, status: "going", purpose: "find_teammates" },
      { event: 7, status: "going" },
      { event: 9, status: "interested", purpose: "find_teammates" },
      { event: 13, status: "interested" },
    ],
  },
  {
    key: "riley",
    name: "Riley Nguyen",
    program: "Psychology",
    yearOfStudy: 3,
    bio: "Private profile (demo account).",
    interests: ["social"],
    isPublic: false, // stays off every attendee list, even with public RSVPs
    followsClubs: ["western-ai", "western-board-games"],
    followsPeople: ["priya"],
    rsvps: [
      { event: 1, status: "going" },
      { event: 4, status: "interested" },
    ],
  },
];

const emailFor = (key: string) => `orbit.demo.${key}@uwo.ca`;

const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 8) {
  console.error(
    "Set DEMO_PASSWORD (8+ characters) in server/.env or before the command, e.g.\n" +
      "  DEMO_PASSWORD=... npm run db:seed:demo",
  );
  process.exit(1);
}

try {
  // 1. Accounts. Created through Better Auth so passwords are hashed the same way as
  //    a normal sign-up. (Can't be inside the transaction below: Better Auth uses its
  //    own database connection.)
  const ids = new Map<string, string>();
  let created = 0;
  for (const account of ACCOUNTS) {
    const email = emailFor(account.key);
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));
    if (existing) {
      ids.set(account.key, existing.id);
      continue;
    }
    const result = await auth.api.signUpEmail({
      body: { email, password, name: account.name },
    });
    ids.set(account.key, result.user.id);
    created++;
  }
  const idOf = (key: string) => {
    const id = ids.get(key);
    if (!id) throw new Error(`Unknown demo account: ${key}`);
    return id;
  };

  // The clubs come from `npm run db:seed`.
  const clubRows = await db
    .select({ id: club.id, slug: club.slug })
    .from(club)
    .where(
      inArray(
        club.slug,
        demoClubs.map((c) => c.slug),
      ),
    );
  const clubIds = new Map(clubRows.map((row) => [row.slug, row.id]));
  const clubIdOf = (slug: string) => {
    const id = clubIds.get(slug);
    if (!id)
      throw new Error(`Club "${slug}" is missing. Run npm run db:seed first.`);
    return id;
  };

  // 2. Everything else, all-or-nothing.
  const warnings: string[] = [];
  await db.transaction(async (tx) => {
    const now = new Date();

    // Wipe the demo accounts' OWN activity first, so a re-run really resets it: follows
    // and RSVPs made while rehearsing disappear. Only rows these six accounts created.
    const demoIds = ACCOUNTS.map((account) => idOf(account.key));
    const nonExecIds = ACCOUNTS.filter((account) => !account.owns).map(
      (account) => idOf(account.key),
    );
    await tx.delete(clubFollow).where(inArray(clubFollow.userId, demoIds));
    await tx.delete(userFollow).where(inArray(userFollow.followerId, demoIds));
    await tx.delete(eventRsvp).where(inArray(eventRsvp.userId, demoIds));
    // Demo students aren't execs anywhere in the seed. This also undoes a rehearsed
    // ownership transfer to one of them (see the exec step below).
    await tx.delete(clubMember).where(inArray(clubMember.userId, nonExecIds));

    for (const account of ACCOUNTS) {
      const userId = idOf(account.key);

      const fields = {
        program: account.program,
        yearOfStudy: account.yearOfStudy,
        bio: account.bio,
        interests: account.interests,
        links: {},
        isPublic: account.isPublic,
      };
      await tx
        .insert(profile)
        .values({ userId, ...fields })
        .onConflictDoUpdate({
          target: profile.userId,
          set: { ...fields, updatedAt: now },
        });

      if (account.owns) {
        const clubId = clubIdOf(account.owns);
        const [owner] = await tx
          .select({ userId: clubMember.userId })
          .from(clubMember)
          .where(
            and(eq(clubMember.clubId, clubId), eq(clubMember.role, "owner")),
          );
        if (!owner || owner.userId === userId) {
          // No owner (e.g. it was transferred to a demo student, removed above) or
          // already the exec: make sure the exec is the owner, even if they were
          // demoted to admin during a rehearsal.
          await tx
            .insert(clubMember)
            .values({ clubId, userId, role: "owner" })
            .onConflictDoUpdate({
              target: [clubMember.clubId, clubMember.userId],
              set: { role: "owner" },
            });
        } else {
          // A real (non-demo) user owns it. Never take a club away from a real owner.
          warnings.push(
            `${account.owns} is owned by a non-demo account, so ${emailFor(account.key)} isn't its owner.`,
          );
        }
      }

      for (const slug of account.followsClubs) {
        await tx
          .insert(clubFollow)
          .values({ userId, clubId: clubIdOf(slug) })
          .onConflictDoNothing();
      }
      for (const key of account.followsPeople) {
        await tx
          .insert(userFollow)
          .values({ followerId: userId, followeeId: idOf(key) })
          .onConflictDoNothing();
      }

      for (const rsvp of account.rsvps) {
        const values = {
          status: rsvp.status,
          showOnAttendeeList: !rsvp.anonymous,
          purpose: rsvp.purpose ?? null,
          lookingForBuddy: false,
        };
        await tx
          .insert(eventRsvp)
          .values({ eventId: demoEventId(rsvp.event), userId, ...values })
          .onConflictDoUpdate({
            target: [eventRsvp.eventId, eventRsvp.userId],
            set: { ...values, updatedAt: now },
          });
      }
    }
  });

  console.log(
    `Demo accounts ready (${created} created, ${ACCOUNTS.length - created} already existed):`,
  );
  for (const account of ACCOUNTS) {
    const role = account.owns
      ? `owner of ${account.owns}`
      : account.isPublic
        ? "student"
        : "student, private profile";
    console.log(
      `  ${emailFor(account.key).padEnd(28)} ${account.name} (${role})`,
    );
  }
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : err);
  console.error(
    "Demo seed failed. Run `npm run db:push` and `npm run db:seed` first.",
  );
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
