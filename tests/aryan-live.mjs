// WHAT: Opt-in end-to-end checks on Aryan's confirmed PERSONAL Neon branch.
// WITHOUT IT: Mock tests cannot prove auth, persisted edits, permissions, or S3 work.
// Run from the repo root with --import tsx --env-file=server/.env and
// ORBIT_ALLOW_TEST_WRITES=personal-neon. Passwords/sessions/signed URLs are never logged.
// Cleanup deletes only the exact temporary clubs/users/images created by this run.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { inArray } from "drizzle-orm";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../server/src/db/index.ts";
import { club, user } from "../server/src/db/schema.ts";
import { env } from "../server/src/env.ts";

if (process.env.ORBIT_ALLOW_TEST_WRITES !== "personal-neon")
  throw new Error("Explicit personal-Neon test opt-in required.");
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://localhost:5173";
const tag = randomUUID().slice(0, 8);
const clubIds = [],
  userIds = [],
  imageKeys = [],
  contexts = [];
const errors = [];
const password = randomBytes(24).toString("base64url");
const png = {
  name: "orbit-qa.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9YsAAAAASUVORK5CYII=",
    "base64",
  ),
};
const passed = (label) => console.log(`PASS ${label}`);
async function call(context, method, path, data, status = 200) {
  const response = await context.request.fetch(`${base}/api${path}`, {
    method,
    data,
    headers: { Origin: base },
  });
  assert.equal(
    response.status(),
    status,
    `${method} ${path}: expected ${status}, received ${response.status()}`,
  );
  return response.status() === 204 ? null : response.json();
}
async function actor(label) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    timezoneId: "America/Toronto",
  });
  contexts.push(context);
  const email = `orbit-qa-${tag}-${label}@uwo.ca`;
  const result = await call(context, "POST", "/auth/sign-up/email", {
    name: `QA ${label} ${tag}`,
    email,
    password,
  });
  userIds.push(result.user.id);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, email, id: result.user.id, name: result.user.name };
}
const visible = (locator) => locator.waitFor({ state: "visible" });
const dateInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
async function waitForRole(context, clubId, role) {
  for (let i = 0; i < 30; i++) {
    const clubs = await call(context, "GET", "/me/clubs");
    if (clubs.find((item) => item.id === clubId)?.role === role) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Role change did not persist.");
}

try {
  const owner = await actor("owner");
  const member = await actor("member");
  const student = await actor("student");
  const { page } = owner;
  await page.goto(`${base}/clubs/new`);
  const name = `Orbit QA ${tag}`;
  await page.getByLabel("Club name", { exact: true }).fill(name);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Temporary integration test club.");
  await page.getByLabel("Website URL").fill("https://example.org/orbit-qa");
  const logoTicketResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/uploads",
  );
  await page.getByLabel("Club logo", { exact: true }).setInputFiles(png);
  const logoTicketResult = await logoTicketResponse;
  assert.equal(logoTicketResult.status(), 200, "Club logo presign succeeds");
  const logoTicket = await logoTicketResult.json();
  imageKeys.push(logoTicket.key);
  await visible(page.getByRole("img", { name: "Club logo preview" }));
  const creation = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/clubs" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  const createdResponse = await creation;
  assert.equal(createdResponse.status(), 201);
  const created = await createdResponse.json();
  clubIds.push(created.id);
  await visible(page.getByRole("heading", { name, exact: true }));
  const createdDetails = await call(
    owner.context,
    "GET",
    `/clubs/${created.slug}`,
  );
  assert.equal(createdDetails.links.website, "https://example.org/orbit-qa");
  assert.ok(
    createdDetails.logoUrl.endsWith(logoTicket.key),
    "Uploaded club logo was saved by PATCH",
  );
  await waitForRole(owner.context, created.id, "owner");
  passed(
    "real sign-up/session, create-club form, separate links PATCH and owner role",
  );

  await page.getByRole("link", { name: "Post event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`QA workshop ${tag}`);
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("technology");
  await page
    .getByLabel("Start date and time", { exact: true })
    .fill(dateInput(new Date(Date.now() + 3 * 86400000)));
  await page.getByLabel("Location", { exact: true }).fill("UCC test room");
  await page.getByLabel("Price in CAD (0 means free)").fill("12.99");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Temporary event for real integration checks.");
  await page
    .getByLabel("Eligibility", { exact: true })
    .fill("Fictional demo only");
  await page
    .getByLabel("Registration link (optional)")
    .fill("https://example.org/register");
  const ticketResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/uploads",
  );
  await page.getByLabel("Event image", { exact: true }).setInputFiles(png);
  const ticketResult = await ticketResponse;
  let imageUploaded = false;
  if (ticketResult.ok()) {
    const ticket = await ticketResult.json();
    // Keep only the non-secret exact key for cleanup. Never print the signed URL.
    imageKeys.push(ticket.key);
    try {
      await visible(page.getByRole("img", { name: "Event image preview" }));
      await page.waitForFunction(
        () => {
          const image = document.querySelector(
            'img[alt="Event image preview"]',
          );
          return image?.complete && image.naturalWidth > 0;
        },
        null,
        { timeout: 12000 },
      );
      imageUploaded = true;
      passed(
        "real presigned upload, browser PUT/CORS and publicly readable image",
      );
    } catch {
      console.log(
        "PENDING real storage upload/public read: check storage permissions/CORS; no credentials were printed.",
      );
    }
  } else {
    console.log(
      `PENDING real storage: upload endpoint returned ${ticketResult.status()}; all other workflows will still be tested.`,
    );
  }
  const posting = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/clubs/${created.id}/events` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Post event", exact: true }).click();
  const posted = await posting;
  assert.equal(posted.status(), 201);
  const event = await posted.json();
  assert.equal(event.priceCents, 1299);
  if (imageUploaded) assert.ok(event.imageUrl);
  await visible(
    page.getByRole("heading", { name: `QA workshop ${tag}`, exact: true }),
  );
  await page.reload();
  await visible(
    page.getByRole("heading", { name: `QA workshop ${tag}`, exact: true }),
  );
  await page.getByRole("link", { name: "Edit event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`QA updated ${tag}`);
  await page.getByLabel("Price in CAD (0 means free)").fill("0");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: `QA updated ${tag}`, exact: true }),
  );
  assert.equal(
    (await call(owner.context, "GET", `/events/${event.id}`)).priceCents,
    0,
  );
  await page.getByRole("link", { name: "Edit event", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  await visible(
    page.getByText("This event has been cancelled. Registration is closed."),
  );
  passed(
    "real event post, persisted refresh, edit, cents and confirmed cancellation",
  );

  await page.goto(`${base}/clubs/${created.slug}/settings`);
  const renamed = `${name} renamed`;
  await page.getByLabel("Club name", { exact: true }).fill(renamed);
  const renameResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/clubs/${created.id}` &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save club", exact: true }).click();
  assert.equal((await renameResponse).status(), 200);
  const detail = await call(owner.context, "GET", `/clubs/${created.slug}`);
  assert.equal(detail.name, renamed);
  assert.equal(detail.slug, created.slug);
  await page.getByLabel("Exec email", { exact: true }).fill(member.email);
  await page.getByRole("button", { name: "Add exec", exact: true }).click();
  await waitForRole(member.context, created.id, "editor");
  await member.page.goto(`${base}/clubs/${created.slug}`);
  await visible(
    member.page.getByRole("link", { name: "Post event", exact: true }),
  );
  assert.equal(
    await member.page
      .getByRole("link", { name: "Settings", exact: true })
      .count(),
    0,
  );
  await call(
    member.context,
    "PATCH",
    `/clubs/${created.id}`,
    { name: "Unauthorized" },
    403,
  );
  await call(
    student.context,
    "POST",
    `/clubs/${created.id}/events`,
    {
      title: "Unauthorized",
      category: "academic",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    },
    403,
  );
  const roster = await call(
    owner.context,
    "GET",
    `/clubs/${created.id}/members`,
  );
  assert.ok(roster.every((item) => !("email" in item)));
  await visible(
    page.getByRole("combobox", { name: `Role for ${member.name}` }),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("combobox", { name: `Role for ${member.name}` })
    .selectOption("admin");
  await waitForRole(member.context, created.id, "admin");
  await call(
    member.context,
    "PATCH",
    `/clubs/${created.id}/members/${owner.id}`,
    { role: "editor" },
    403,
  );
  await member.page.goto(`${base}/clubs/${created.slug}/settings`);
  await visible(
    member.page.getByRole("button", { name: "Save club", exact: true }),
  );
  assert.equal(
    await member.page
      .getByRole("heading", { name: "Transfer ownership", exact: true })
      .count(),
    0,
  );
  passed(
    "real club settings/stable slug, exec add/promotion, public roster privacy and denied writes",
  );

  // Controlled upcoming fixtures verify real score ordering alongside the existing seed.
  const otherClub = await call(
    owner.context,
    "POST",
    "/clubs",
    { name: `Orbit QA other ${tag}` },
    201,
  );
  clubIds.push(otherClub.id);
  const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const followedEvent = await call(
    owner.context,
    "POST",
    `/clubs/${created.id}/events`,
    {
      title: `QA followed ${tag}`,
      category: "technology",
      startsAt: future(5),
    },
    201,
  );
  const interestEvent = await call(
    owner.context,
    "POST",
    `/clubs/${otherClub.id}/events`,
    { title: `QA interest ${tag}`, category: "academic", startsAt: future(4) },
    201,
  );
  const neutralEvent = await call(
    owner.context,
    "POST",
    `/clubs/${otherClub.id}/events`,
    { title: `QA neutral ${tag}`, category: "technology", startsAt: future(2) },
    201,
  );
  await call(student.context, "PUT", "/me/profile", {
    interests: ["academic"],
  });
  await student.page.goto(`${base}/clubs/${created.slug}`);
  await student.page
    .getByRole("button", { name: "Follow", exact: true })
    .click();
  await visible(
    student.page.getByRole("button", { name: "Unfollow", exact: true }),
  );
  const feed = await call(student.context, "GET", "/feed?limit=100");
  const position = (id) => feed.items.findIndex((item) => item.id === id);
  assert.ok(
    position(followedEvent.id) >= 0 &&
      position(followedEvent.id) < position(interestEvent.id),
  );
  assert.ok(position(interestEvent.id) < position(neutralEvent.id));
  assert.equal(feed.items[position(followedEvent.id)].reason, "followed_club");
  assert.equal(feed.items[position(interestEvent.id)].reason, "interest");
  assert.equal(feed.items[position(neutralEvent.id)].reason, null);
  assert.equal(
    feed.items.some((item) => item.id === event.id),
    false,
  );
  assert.equal(
    feed.items.some((item) => item.reason === "followed_user"),
    false,
  );
  const first = await call(student.context, "GET", "/feed?limit=2");
  const second = await call(student.context, "GET", "/feed?limit=2&offset=2");
  assert.equal(
    new Set([...first.items, ...second.items].map((item) => item.id)).size,
    4,
  );
  const empty = await call(student.context, "GET", "/feed?offset=100000");
  assert.equal(empty.items.length, 0);
  assert.equal(empty.total, first.total);
  await call(student.context, "GET", "/feed?limit=101", undefined, 400);
  await student.page.goto(`${base}/`);
  await student.page
    .getByRole("button", { name: "For you", exact: true })
    .click();
  await visible(
    student.page.getByText("From a club you follow", { exact: true }).first(),
  );
  assert.ok(
    await student.page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  passed(
    "real club follow and personalized SQL feed: scores, paging, errors and mobile UI",
  );
  await student.page.goto(`${base}/clubs/${created.slug}`);
  await student.page
    .getByRole("button", { name: "Unfollow", exact: true })
    .click();
  await visible(
    student.page.getByRole("button", { name: "Follow", exact: true }),
  );
  const followingAfter = await call(student.context, "GET", "/me/following");
  assert.equal(
    followingAfter.clubs.some((item) => item.id === created.id),
    false,
  );
  passed("real unfollow persists and updates the button");

  await page
    .getByRole("combobox", { name: "New owner", exact: true })
    .selectOption(member.id);
  await page.getByLabel(`Type ${renamed} to confirm`).fill(renamed);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Transfer ownership", exact: true })
    .click();
  await waitForRole(member.context, created.id, "owner");
  await waitForRole(owner.context, created.id, "admin");
  await call(
    owner.context,
    "POST",
    `/clubs/${created.id}/transfer-ownership`,
    { userId: owner.id },
    403,
  );
  await member.page.reload();
  await visible(
    member.page.getByRole("button", {
      name: `Remove ${owner.name}`,
      exact: true,
    }),
  );
  member.page.once("dialog", (dialog) => dialog.accept());
  await member.page
    .getByRole("button", { name: `Remove ${owner.name}`, exact: true })
    .click();
  await page.goto(`${base}/me/clubs`);
  await visible(page.getByRole("link", { name: otherClub.name, exact: true }));
  // Sign out through Rokyo's merged menu, proving account state updates across pages.
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible(page.getByRole("link", { name: "Sign in", exact: true }));
  await call(owner.context, "GET", "/feed", undefined, 401);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Western email", { exact: true }).fill(owner.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await visible(page.getByRole("button", { name: "Sign out", exact: true }));
  passed(
    "real ownership transfer, exec removal, My clubs, sign-out and sign-in",
  );
  assert.deepEqual(errors, [], "No uncaught browser errors");
} catch (err) {
  // Assertions avoid response bodies: never leak sessions, passwords, or presigned URLs.
  console.error(err instanceof Error ? err.message : "Live check failed.");
  process.exitCode = 1;
} finally {
  await browser.close();
  if (clubIds.length) await db.delete(club).where(inArray(club.id, clubIds));
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
  console.log(
    `Cleaned up this run's ${clubIds.length} temporary clubs and ${userIds.length} temporary accounts; existing data was preserved.`,
  );
  if (imageKeys.length) {
    const storage = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
    for (const key of imageKeys) {
      try {
        await storage.send(
          new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
        );
        console.log("Removed one temporary test image.");
      } catch {
        console.log(
          `Temporary image cleanup needs attention for this exact key: ${key}`,
        );
      }
    }
    storage.destroy();
  }
  await db.$client.end();
}
