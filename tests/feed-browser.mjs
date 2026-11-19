// WHAT: Real browser regressions for URL filters, privacy-safe cards, and settings.
// All API requests are intercepted; no writes reach a real database.
// Run against a normal Vite server (default http://127.0.0.1:5185):
// node tests/feed-browser.mjs /absolute/path/to/playwright/index.mjs
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright"
);
const base = process.env.ORBIT_TEST_BASE_URL ?? "http://127.0.0.1:5185";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  // The error-retention scenario deliberately returns one HTTP 500.
  if (
    message.type() === "error" &&
    !message.text().startsWith("Failed to load resource:")
  )
    errors.push(message.text());
});
const queries = [];
let signedIn = true;
let role = "owner";
let refreshDelay = 0;
let sessionDelay = 0;
let clubName = "Test Club";
const club = () => ({
  id: "club-1",
  name: clubName,
  slug: "test-club",
  description: "Club description",
  logoUrl: null,
  links: {},
  isFollowing: false,
});
const fixtures = Array.from({ length: 25 }, (_, index) => ({
  id: `event-${index}`,
  title: `Event ${index}`,
  description: "Test event",
  category: "technology",
  startsAt: "2099-11-25T23:00:00Z",
  endsAt: null,
  location: "UCC",
  priceCents: 0,
  imageUrl: null,
  club: club(),
  eligibility: "All students",
  registrationUrl: null,
  cancelledAt: null,
}));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const visible = (locator) => locator.waitFor({ state: "visible" });
const heading = (name) => page.getByRole("heading", { name, exact: true });
const button = (name) => page.getByRole("button", { name, exact: true });
const search = () => page.getByLabel("Search events", { exact: true });
const params = () => new URL(page.url()).searchParams;
const passed = (name) => console.log(`PASS ${name}`);
async function until(check) {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(30);
  }
  throw new Error("Timed out waiting for browser state");
}
async function ready() {
  await visible(page.getByText(/^Showing \d/));
  await page
    .getByText("Updating…", { exact: true })
    .waitFor({ state: "hidden" });
}
await context.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  if (url.pathname === "/api/auth/get-session") {
    await sleep(sessionDelay);
    return route.fulfill({
      json: signedIn
        ? {
            user: {
              id: "a",
              name: "Account A",
              email: "a@uwo.ca",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: "session-a",
              userId: "a",
              expiresAt: "2099-01-01T00:00:00Z",
            },
          }
        : null,
    });
  }
  if (url.pathname === "/api/auth/sign-out") {
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  }
  if (url.pathname === "/api/events" || url.pathname === "/api/feed") {
    queries.push(url);
    const q = url.searchParams.get("q") ?? "";
    await sleep(q === "slow" ? 900 : 180);
    if (q === "failure")
      return route.fulfill({ status: 500, json: { error: "Test failure" } });
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const personalized = url.pathname === "/api/feed";
    if (q === "no-match")
      return route.fulfill({ json: { total: 0, items: [] } });
    return route.fulfill({
      json: {
        total: fixtures.length,
        items: fixtures.slice(offset, offset + 12).map((event) => ({
          ...event,
          title: q ? `${q}: ${event.title}` : event.title,
          ...(personalized ? { reason: "followed_user" } : {}),
        })),
      },
    });
  }
  if (/^\/api\/events\/event-\d+$/.test(url.pathname))
    return route.fulfill({
      json: fixtures.find((event) => url.pathname.endsWith(`/${event.id}`)),
    });
  if (url.pathname.endsWith("/rsvp"))
    return route.fulfill({
      json: { goingCount: 0, interestedCount: 0, mine: null },
    });
  if (url.pathname.endsWith("/attendees")) return route.fulfill({ json: [] });
  if (url.pathname === "/api/me/clubs") {
    await sleep(refreshDelay);
    return route.fulfill({ json: [{ ...club(), role }] });
  }
  if (url.pathname === "/api/clubs/test-club") {
    await sleep(refreshDelay);
    return route.fulfill({ json: club() });
  }
  if (url.pathname === "/api/clubs/club-1" && method === "PATCH") {
    clubName = route.request().postDataJSON().name;
    refreshDelay = 700;
    return route.fulfill({ json: club() });
  }
  if (url.pathname === "/api/clubs/club-1/members") {
    await sleep(refreshDelay);
    return route.fulfill({
      json: [
        { userId: "a", name: "Account A", role },
        {
          userId: "b",
          name: "Account B",
          role: role === "owner" ? "editor" : "owner",
        },
      ],
    });
  }
  if (url.pathname === "/api/clubs/club-1/transfer-ownership") {
    role = "admin";
    return route.fulfill({ status: 204 });
  }
  errors.push(`Unexpected intercepted API request: ${method} ${url.pathname}`);
  return route.fulfill({
    status: 404,
    json: { error: "Unexpected test request" },
  });
});

try {
  const initial = new URLSearchParams({
    q: "C++ & AI",
    category: "technology",
    page: "2",
    tab: "all",
  });
  await page.goto(`${base}/?${initial}`);
  await ready();
  assert.equal(await search().inputValue(), "C++ & AI");
  assert.equal(await button("Technology").getAttribute("aria-pressed"), "true");
  await visible(page.getByText("Page 2", { exact: true }));
  assert.equal(queries.at(-1).searchParams.get("offset"), "12");
  assert.equal(queries.at(-1).searchParams.get("category"), "technology");
  assert.equal(queries.at(-1).searchParams.get("q"), "C++ & AI");
  await heading("C++ & AI: Event 12").click();
  await visible(heading("Event 12"));
  await page.reload();
  await visible(heading("Event 12"));
  assert.equal(
    await page
      .getByRole("link", { name: "← Back to events" })
      .getAttribute("href"),
    `/?${initial}`,
  );
  await page.getByRole("link", { name: "← Back to events" }).click();
  await ready();
  await visible(heading("C++ & AI: Event 12"));
  await heading("C++ & AI: Event 12").click();
  await visible(heading("Event 12"));
  await page.goBack();
  await ready();
  assert.equal(params().toString(), initial.toString());
  await page.reload();
  await ready();
  await visible(heading("C++ & AI: Event 12"));
  passed(
    "shared URL, encoded search, category/page, reload, browser Back, detail return link",
  );

  await button("Social").click();
  await until(() => params().get("category") === "social");
  await ready();
  assert.equal(params().get("page"), null);
  await page.goBack();
  await ready();
  assert.equal(params().get("page"), "2");
  assert.equal(params().get("category"), "technology");
  await page.goForward();
  await ready();
  assert.equal(params().get("category"), "social");
  await button("Next").click();
  await visible(page.getByText("Page 2", { exact: true }));
  await ready();
  queries.length = 0;
  await search().fill("");
  await search().pressSequentially("networking", { delay: 20 });
  assert.equal(queries.length, 0, "no request while typing from page two");
  await visible(heading("networking: Event 0"));
  assert.equal(queries.length, 1);
  assert.equal(queries[0].searchParams.get("offset"), "0");
  assert.equal(params().get("q"), "networking");
  await search().fill("slow");
  await until(() =>
    queries.some((url) => url.searchParams.get("q") === "slow"),
  );
  await search().fill("latest");
  await visible(heading("latest: Event 0"));
  await sleep(1000);
  assert.equal(await heading("slow: Event 0").count(), 0);
  await search().fill("failure");
  await visible(page.getByText("Could not load events: Test failure"));
  await visible(heading("latest: Event 0"));
  await search().fill("latest");
  await ready();
  passed(
    "Back/Forward filters, single debounced request, stale responses and retained error results",
  );

  await button("For you").click();
  await visible(
    page.getByText("People you follow are going", { exact: true }).first(),
  );
  await ready();
  assert.equal(params().get("tab"), "for-you");
  assert.equal(params().get("page"), null);
  assert.equal(await search().count(), 0);
  await visible(
    page.getByText("People you follow are going", { exact: true }).first(),
  );
  assert.equal(queries.at(-1).pathname, "/api/feed");
  assert.equal(queries.at(-1).searchParams.get("q"), null);
  await button("Next").click();
  await visible(page.getByText("Page 2", { exact: true }));
  await ready();
  const forYouUrl = page.url();
  await heading("Event 12").click();
  await visible(heading("Event 12"));
  await page.getByRole("link", { name: "← Back to events" }).click();
  await ready();
  assert.equal(page.url(), forYouUrl);
  await button("All events").click();
  await visible(search());
  await ready();
  assert.equal(await search().inputValue(), "latest");
  assert.equal(params().get("category"), "social");
  await page.goBack();
  await ready();
  assert.equal(page.url(), forYouUrl);
  passed(
    "For you tab/page survives detail and history; All-event filters stay separate",
  );

  // Session resolution must not discard a bookmarked personalized page.
  sessionDelay = 400;
  await page.reload();
  await visible(button("For you"));
  await visible(
    page.getByText("People you follow are going", { exact: true }).first(),
  );
  await visible(page.getByText("Page 2", { exact: true }));
  sessionDelay = 0;
  await button("Sign out").click();
  await button("For you").waitFor({ state: "hidden" });
  await ready();
  assert.equal(await button("For you").count(), 0);
  assert.equal(
    await page
      .getByText("People you follow are going", { exact: true })
      .count(),
    0,
  );
  await page.goto(forYouUrl);
  await ready();
  assert.equal(await button("For you").count(), 0);
  assert.equal(
    await page
      .getByText("People you follow are going", { exact: true })
      .count(),
    0,
  );
  passed(
    "delayed session preserves personalized deep link; sign-out hides personalized cards",
  );

  for (const value of ["-1", "1.5", "garbage", "999999999999999999999"]) {
    await page.goto(`${base}/?page=${value}&category=invalid&tab=invalid`);
    await ready();
    await visible(heading("Event 0"));
    assert.equal(queries.at(-1).searchParams.get("offset"), "0");
    assert.equal(queries.at(-1).searchParams.get("category"), null);
  }
  passed("invalid page/category/tab safely fall back to All events page one");

  await page.goto(`${base}/?page=4`);
  await visible(
    page.getByText("No events found on this page.", { exact: true }),
  );
  assert.equal(await page.getByText("Showing 37–36 of 25 events").count(), 0);
  await button("Back to first page").click();
  await visible(heading("Event 0"));
  await button("Social").click();
  await until(() => params().get("category") === "social");
  await ready();
  await search().fill("do-not-commit");
  await page.goBack();
  await until(() => params().get("category") === null);
  await sleep(500);
  assert.equal(await search().inputValue(), "");
  assert.equal(params().get("q"), null);

  // Inject one more keystroke exactly while the router is committing a query:
  // history changes before React finishes rendering the location transition.
  await page.evaluate(() => {
    const original = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      original(...args);
      if (new URL(location.href).searchParams.get("q") !== "net") return;
      history.replaceState = original;
      const input = document.querySelector("#event-search");
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(input, "networking");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
  });
  await search().fill("net");
  await visible(heading("networking: Event 0"));
  assert.equal(await search().inputValue(), "networking");
  assert.equal(params().get("q"), "networking");
  await search().fill("no-match");
  await visible(page.getByText("No events found.", { exact: true }));
  await button("Clear filters").click();
  await visible(heading("Event 0"));
  assert.equal(await search().inputValue(), "");
  assert.equal(params().get("q"), null);
  passed(
    "out-of-range pages, Back during debounce, typing during URL commit, clear filters",
  );

  signedIn = true;
  await page.goto(`${base}/clubs/test-club/settings`);
  const name = page.getByLabel("Club name", { exact: true });
  await name.fill("Renamed Club");
  const nameNode = await name.elementHandle();
  await button("Save club").click();
  await visible(page.getByText("Club saved.", { exact: true }));
  assert.ok(await nameNode.evaluate((element) => element.isConnected));
  await sleep(900);
  assert.ok(await nameNode.evaluate((element) => element.isConnected));
  assert.equal(await name.inputValue(), "Renamed Club");
  await visible(page.getByText("Club saved.", { exact: true }));
  const description = page.getByRole("textbox", { name: /^Description/ });
  await description.fill("Unsaved draft must survive transfer");
  await page
    .getByRole("combobox", { name: "New owner", exact: true })
    .selectOption("b");
  await page.getByLabel("Type Renamed Club to confirm").fill("Renamed Club");
  page.once("dialog", (dialog) => dialog.accept());
  await button("Transfer ownership").click();
  await visible(
    page.getByText("Ownership transferred. You are now an admin.", {
      exact: true,
    }),
  );
  assert.ok(await nameNode.evaluate((element) => element.isConnected));
  await button("Transfer ownership").waitFor({ state: "hidden" });
  await sleep(900);
  await visible(
    page.getByText("Ownership transferred. You are now an admin.", {
      exact: true,
    }),
  );
  assert.equal(
    await description.inputValue(),
    "Unsaved draft must survive transfer",
  );
  assert.equal(await button("Remove Account B").count(), 0);
  await visible(button("Save club"));
  passed(
    "save and ownership transfer preserve mounted form, messages, drafts, and updated permissions",
  );

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(`${base}/?tab=for-you`);
    await ready();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  assert.deepEqual(errors, []);
  passed(
    "mobile/desktop feed layout and no uncaught errors or unexpected API traffic",
  );
} catch (error) {
  console.error({
    url: page.url(),
    queries: queries.map((url) => `${url.pathname}${url.search}`),
    errors,
    content: (await page.locator("main").innerText()).slice(0, 2000),
  });
  throw error;
} finally {
  await browser.close();
}
