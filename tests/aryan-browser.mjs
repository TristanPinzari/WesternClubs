// WHAT: Repeatable Chrome smoke tests for Aryan's review fixes and club-exec frontend.
// WITHOUT IT: A typecheck cannot verify debounce timing, role controls, or mobile layout.
// Run with normal Vite :5173 and VITE_USE_MOCK_EXEC=true Vite :5174.
// Pass the absolute path to an installed playwright/index.mjs as the first argument.
// Mock/HTTP-intercept tests never send mutation requests to the real API.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const modulePath = process.argv[2];
const { chromium } = await import(
  modulePath ? pathToFileURL(modulePath).href : "playwright"
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  timezoneId: "America/Toronto",
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const passed = (label) => console.log(`PASS ${label}`);
const visible = (locator) => locator.waitFor({ state: "visible" });
async function until(check, label) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`Timed out: ${label}`);
}
const ready = () =>
  visible(page.getByRole("status").filter({ hasText: /^Showing / }));
async function noOverflow(label) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    label,
  );
}
async function capture(path) {
  // Full-page screenshots otherwise capture the sticky header at the current scroll offset.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}
const png = {
  name: "pixel.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9YsAAAAASUVORK5CYII=",
    "base64",
  ),
};
try {
  // Explicit exec-demo mode must need no API, including no real sign-in or mutations.
  const requests = [];
  await page.route("**/api/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto("http://localhost:5174/");
  await ready();
  await page.getByRole("button", { name: "For you", exact: true }).click();
  await ready();
  await visible(page.getByText("From a club you follow", { exact: true }));
  await visible(
    page.getByText("People you follow are going or interested", {
      exact: true,
    }),
  );
  assert.equal(await page.getByText(/followers/i).count(), 0);
  await noOverflow("For-you mobile layout");
  await capture("docs/tasks/aryan-screenshots/for-you-mobile.png");
  passed("mock personalized feed, reasons, no follower counts");

  await page.getByRole("link", { name: "Clubs", exact: true }).click();
  await page.getByRole("link", { name: "Western AI", exact: true }).click();
  await visible(page.getByRole("heading", { name: "Western AI", exact: true }));
  await visible(page.getByRole("link", { name: "Post event", exact: true }));
  await visible(page.getByRole("link", { name: "Settings", exact: true }));
  await page.getByRole("button", { name: "Unfollow", exact: true }).click();
  await visible(page.getByRole("button", { name: "Follow", exact: true }));
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await visible(page.getByRole("button", { name: "Unfollow", exact: true }));
  assert.equal(
    await page.locator('main a[href^="/events/"]:not([href$="/edit"])').count(),
    1,
  );
  passed("club info, club-only events, exec links, follow/unfollow");

  await page.getByRole("link", { name: "Post event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Demo mobile workshop");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("technology");
  await page
    .getByLabel("Start date and time", { exact: true })
    .fill("2030-11-25T18:00");
  await page
    .getByLabel("End date and time (optional)")
    .fill("2030-11-25T17:00");
  await page.getByLabel("Location", { exact: true }).fill("UCC 100");
  await page.getByLabel("Price in CAD (0 means free)").fill("12.99");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A fictional workshop for testing.");
  await page.getByLabel("Eligibility", { exact: true }).fill("All students");
  await page.getByRole("button", { name: "Post event", exact: true }).click();
  await visible(page.getByText("End time must be after start time."));
  await page
    .getByLabel("End date and time (optional)")
    .fill("2030-11-25T20:00");
  await page
    .getByLabel("Registration link (optional)")
    .fill("https://example.org/demo");
  await page.getByLabel("Event image", { exact: true }).setInputFiles(png);
  await visible(page.getByRole("img", { name: "Event image preview" }));
  await noOverflow("event form mobile layout");
  await capture("docs/tasks/aryan-screenshots/event-form-mobile.png");
  await page.getByRole("button", { name: "Post event", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Demo mobile workshop", exact: true }),
  );
  await visible(page.getByText("$12.99 CAD", { exact: true }));
  await page.getByRole("link", { name: "Edit event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Updated demo workshop");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Updated demo workshop", exact: true }),
  );
  await page.getByRole("link", { name: "Edit event", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  assert.ok(page.url().endsWith("/edit"));
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  await visible(
    page.getByText("This event has been cancelled. Registration is closed."),
  );
  assert.equal(await page.getByRole("link", { name: /^Register/ }).count(), 0);
  passed("post/edit/image/price validation and cancel confirmation");

  await page.getByRole("link", { name: "Clubs", exact: true }).click();
  await page.getByRole("link", { name: "Create a club", exact: true }).click();
  await page.getByLabel("Club name", { exact: true }).fill("Demo New Club");
  await page.getByLabel("Description", { exact: true }).fill("New demo club");
  await page.getByLabel("Club logo", { exact: true }).setInputFiles(png);
  await visible(page.getByRole("img", { name: "Club logo preview" }));
  await page.getByLabel("Website URL").fill("https://example.org/club");
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Demo New Club", exact: true }),
  );
  assert.ok(page.url().endsWith("/clubs/demo-new-club"));
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Club name", { exact: true }).fill("Renamed Demo Club");
  await page.getByRole("button", { name: "Save club", exact: true }).click();
  await until(
    async () =>
      (await page.getByLabel("Club name", { exact: true }).inputValue()) ===
      "Renamed Demo Club",
    "renamed club",
  );
  assert.ok(page.url().endsWith("/clubs/demo-new-club/settings"));
  await page
    .getByLabel("Exec email", { exact: true })
    .fill("demo-teammate@uwo.ca");
  await page.getByRole("button", { name: "Add exec", exact: true }).click();
  await visible(
    page.getByRole("button", { name: "Remove demo-teammate", exact: true }),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("combobox", { name: "Role for demo-teammate" })
    .selectOption("admin");
  await until(
    async () =>
      (await page
        .getByRole("combobox", { name: "Role for demo-teammate" })
        .inputValue()) === "admin",
    "promoted exec",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Remove demo-teammate", exact: true })
    .click();
  await until(
    async () =>
      (await page
        .getByRole("button", { name: "Remove demo-teammate", exact: true })
        .count()) === 0,
    "removed exec",
  );
  await page.getByLabel("Exec email", { exact: true }).fill("new-owner@uwo.ca");
  await page.getByRole("button", { name: "Add exec", exact: true }).click();
  await visible(
    page.getByRole("button", { name: "Remove new-owner", exact: true }),
  );
  await page
    .getByRole("combobox", { name: "New owner", exact: true })
    .selectOption({ label: "new-owner" });
  assert.equal(
    await page
      .getByRole("button", { name: "Transfer ownership", exact: true })
      .isEnabled(),
    false,
  );
  await page
    .getByLabel("Type Renamed Demo Club to confirm")
    .fill("Renamed Demo Club");
  await noOverflow("club settings mobile layout");
  await capture("docs/tasks/aryan-screenshots/club-settings-mobile.png");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Transfer ownership", exact: true })
    .click();
  await until(
    async () =>
      (await page
        .getByRole("heading", { name: "Transfer ownership", exact: true })
        .count()) === 0,
    "old owner becomes admin",
  );
  await visible(page.getByRole("heading", { name: "Club execs", exact: true }));
  assert.equal(
    await page
      .getByRole("button", { name: "Remove new-owner", exact: true })
      .count(),
    0,
  );
  passed(
    "create/rename stable slug, add/promote/remove execs, confirmed ownership transfer",
  );

  await page.goto("http://localhost:5174/clubs/western-finance-association");
  await visible(page.getByRole("link", { name: "Post event", exact: true }));
  assert.equal(
    await page.getByRole("link", { name: "Settings", exact: true }).count(),
    0,
  );
  await page.goto(
    "http://localhost:5174/clubs/western-finance-association/settings",
  );
  await visible(
    page.getByText("Only this club's owner and admins can change settings."),
  );
  assert.equal(
    await page.getByRole("button", { name: "Save club", exact: true }).count(),
    0,
  );
  await page.goto(
    "http://localhost:5174/clubs/western-science-society/settings",
  );
  await visible(page.getByRole("button", { name: "Save club", exact: true }));
  assert.equal(
    await page
      .getByRole("heading", { name: "Transfer ownership", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(
    await page
      .getByRole("combobox", { name: "New exec role", exact: true })
      .locator("option")
      .allTextContents(),
    ["Editor"],
  );
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await noOverflow(`settings ${width}px`);
  }
  assert.deepEqual(requests, [], "No backend traffic from exec mock mode");
  passed(
    "admin/editor restrictions, direct-route protection, mobile/desktop, zero mock API requests",
  );

  // Intercepted production-mode requests test the real adapter, not the mock store.
  await page.unroute("**/api/**");
  await page.setViewportSize({ width: 375, height: 812 });
  const fixtures = Array.from({ length: 25 }, (_, index) => ({
    id: `event-${index}`,
    title: `Event ${index}`,
    description: "Networking workshop",
    category: "technology",
    startsAt: "2030-11-25T23:00:00Z",
    endsAt: null,
    location: "UCC",
    priceCents: 0,
    imageUrl: null,
    club: { id: "club-1", name: "Test Club", slug: "test-club" },
  }));
  const queries = [];
  let signedIn = false;
  let uploadFails = true;
  let clubPatchFails = false;
  const writes = [];
  const session = () =>
    signedIn
      ? {
          user: {
            id: "test-user",
            name: "Test User",
            email: "test@uwo.ca",
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          session: {
            id: "test-session",
            userId: "test-user",
            expiresAt: "2035-01-01T00:00:00Z",
          },
        }
      : null;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session")
      return route.fulfill({ json: session() });
    if (url.pathname === "/api/events") {
      queries.push(url);
      const q = url.searchParams.get("q") ?? "";
      await new Promise((resolve) =>
        setTimeout(resolve, q === "slow" ? 900 : 450),
      );
      if (q === "failure")
        return route.fulfill({
          status: 500,
          json: { error: "Test API failure" },
        });
      const offset = Number(url.searchParams.get("offset"));
      const items =
        q === "no-match"
          ? []
          : fixtures.slice(offset, offset + 12).map((item) => ({
              ...item,
              title: q ? `${q}: ${item.title}` : item.title,
            }));
      return route.fulfill({
        json: { items, total: q === "no-match" ? 0 : fixtures.length },
      });
    }
    if (url.pathname === "/api/feed")
      return route.fulfill({
        json: {
          items: [{ ...fixtures[0], reason: "followed_club" }],
          total: 1,
        },
      });
    if (url.pathname === "/api/uploads") {
      writes.push({ path: url.pathname, body: route.request().postDataJSON() });
      return route.fulfill({
        json: {
          key: "clubs/00000000-0000-4000-8000-000000000001.png",
          uploadUrl: "https://storage.example.test/image",
          publicUrl: "https://cdn.example.test/image",
        },
      });
    }
    if (url.pathname === "/api/clubs" && route.request().method() === "POST") {
      writes.push({ path: url.pathname, body: route.request().postDataJSON() });
      return route.fulfill({
        status: 201,
        json: { id: "club-1", slug: "test-club" },
      });
    }
    if (url.pathname === "/api/clubs/test-club")
      return route.fulfill({
        json: {
          id: "club-1",
          name: "Test Club",
          slug: "test-club",
          description: "Created",
          logoUrl: null,
        },
      });
    if (
      url.pathname === "/api/clubs/club-1" &&
      route.request().method() === "PATCH"
    ) {
      writes.push({ path: url.pathname, body: route.request().postDataJSON() });
      if (clubPatchFails)
        return route.fulfill({
          status: 500,
          json: { error: "Test settings failure" },
        });
      return route.fulfill({
        json: {
          id: "club-1",
          name: "Test Club",
          slug: "test-club",
          description: "Created",
          logoUrl: null,
          links: {},
          isFollowing: false,
        },
      });
    }
    if (url.pathname === "/api/me/clubs") return route.fulfill({ json: [] });
    if (url.pathname === "/api/me/following")
      return route.fulfill({ json: { clubs: [], users: [] } });
    return route.fulfill({
      status: 404,
      json: { error: "Endpoint not merged" },
    });
  });
  await page.route("https://storage.example.test/**", async (route) => {
    assert.equal(route.request().method(), "PUT");
    assert.equal(route.request().headers()["content-type"], "image/png");
    assert.equal(route.request().headers().cookie, undefined);
    return route.fulfill({
      status: uploadFails ? 403 : 200,
      body: "",
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("https://cdn.example.test/**", (route) =>
    route.fulfill({ body: png.buffer, contentType: "image/png" }),
  );
  await page.goto("http://localhost:5173/");
  await ready();
  assert.equal(
    await page.getByRole("button", { name: "For you", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollbarGutter,
    ),
    "stable",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await visible(page.getByText("Updating…", { exact: true }));
  await visible(page.getByRole("heading", { name: "Event 0", exact: true }));
  await visible(page.getByText("Page 2", { exact: true }));
  queries.length = 0;
  await page
    .getByLabel("Search events", { exact: true })
    .pressSequentially("networking", { delay: 30 });
  assert.equal(queries.length, 0, "No requests while typing from page two");
  await visible(page.getByRole("heading", { name: "Event 12", exact: true }));
  await visible(
    page.getByRole("heading", { name: "networking: Event 0", exact: true }),
  );
  assert.equal(queries.length, 1, "Exactly one debounced request");
  assert.equal(queries[0].searchParams.get("offset"), "0");
  await page.getByLabel("Search events", { exact: true }).fill("failure");
  await visible(page.getByText("Could not load events: Test API failure"));
  await visible(
    page.getByRole("heading", { name: "networking: Event 0", exact: true }),
  );
  await page.getByLabel("Search events", { exact: true }).fill("slow");
  await until(
    () => queries.some((url) => url.searchParams.get("q") === "slow"),
    "slow request started",
  );
  await page.getByLabel("Search events", { exact: true }).fill("no-match");
  await visible(page.getByText("No events found.", { exact: true }));
  await new Promise((resolve) => setTimeout(resolve, 950));
  assert.equal(
    await page
      .getByRole("heading", { name: "slow: Event 0", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await visible(page.getByRole("heading", { name: "Event 0", exact: true }));
  passed(
    "300ms debounce, one request from page two, retained cards, real errors, stale-response protection, scrollbar gutter",
  );

  signedIn = true;
  await page.reload();
  await ready();
  await page.getByRole("button", { name: "For you", exact: true }).click();
  await visible(page.getByText("From a club you follow", { exact: true }));
  assert.equal(
    await page.getByLabel("Search events", { exact: true }).count(),
    0,
  );
  signedIn = false;
  await page.reload();
  await ready();
  assert.equal(
    await page.getByText("From a club you follow", { exact: true }).count(),
    0,
  );
  await page.goto("http://localhost:5173/clubs/new");
  await visible(page.getByText("Sign in to create a club."));
  assert.equal(await page.getByLabel("Club name", { exact: true }).count(), 0);
  passed("signed-out restrictions and live feed adapter");

  signedIn = true;
  await page.reload();
  await page.getByLabel("Club name", { exact: true }).fill("Test Club");
  await page.getByLabel("Club logo", { exact: true }).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await visible(page.getByText("Choose a JPEG, PNG, WebP, or GIF image."));
  assert.equal(writes.length, 0);
  await page.getByLabel("Club logo", { exact: true }).setInputFiles(png);
  await visible(page.getByText("Image upload failed (403). Try again."));
  assert.equal(
    await page.getByRole("img", { name: "Club logo preview" }).count(),
    0,
  );
  uploadFails = false;
  await page.getByLabel("Club logo", { exact: true }).setInputFiles(png);
  await visible(page.getByRole("img", { name: "Club logo preview" }));
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await visible(page.getByRole("heading", { name: "Test Club", exact: true }));
  assert.deepEqual(writes[0].body, {
    folder: "clubs",
    contentType: "image/png",
    size: png.buffer.length,
  });
  assert.equal(
    writes.at(-1).body.logoKey,
    "clubs/00000000-0000-4000-8000-000000000001.png",
  );
  const createRequest = writes.find((request) => request.path === "/api/clubs");
  assert.deepEqual(Object.keys(createRequest.body).sort(), [
    "description",
    "name",
  ]);
  assert.equal(writes.at(-1).body.logoUrl, undefined);
  passed(
    "upload validation, failed PUT, retry, folder/contentType request and persisted key",
  );

  clubPatchFails = true;
  const creationsBefore = writes.filter(
    (request) => request.path === "/api/clubs",
  ).length;
  await page.goto("http://localhost:5173/clubs/new");
  await page.getByLabel("Club name", { exact: true }).fill("Partial save test");
  await page.getByLabel("Website URL").fill("https://example.org");
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await visible(
    page.getByText(
      "Your club was created, but its logo or links could not be saved. Please add them again in Settings.",
    ),
  );
  assert.equal(
    writes.filter((request) => request.path === "/api/clubs").length,
    creationsBefore + 1,
  );
  assert.ok(page.url().endsWith("/clubs/test-club"));
  assert.equal(
    await page
      .getByRole("button", { name: "Create club", exact: true })
      .count(),
    0,
  );
  passed(
    "partial club creation redirects with a warning instead of creating a duplicate",
  );

  // Only public GETs touch the real backend in the final smoke test.
  await page.unroute("**/api/**");
  await page.goto("http://localhost:5173/clubs");
  await visible(page.getByRole("link", { name: "Western AI", exact: true }));
  await page.getByRole("link", { name: "Western AI", exact: true }).click();
  await visible(page.getByRole("heading", { name: "Western AI", exact: true }));
  await until(
    async () => (await page.locator('main a[href^="/events/"]').count()) > 0,
    "live club events",
  );
  await noOverflow("live club detail mobile");
  await capture("docs/tasks/aryan-screenshots/club-detail-mobile.png");
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await ready();
  passed(
    "real read-only Clubs/detail/club-filtered events/feed against current main API",
  );
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  assert.deepEqual(errors, [], "No uncaught browser errors");
  await browser.close();
}
