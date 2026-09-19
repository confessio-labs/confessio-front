import { test, expect, type Page } from "@playwright/test";
import churchDetails from "./fixtures/church-details.json";

// The client hardcodes this base (src/utils.ts), so intercepting it makes these
// tests deterministic and offline — unlike tests/seo.spec.ts, which deliberately
// exercises the real SSR path.
const API = "https://confessio.fr/front/api";
const CHURCH_UUID = churchDetails.uuid;

type Json = Record<string, unknown>;

async function stubApi(page: Page, overrides: Json = {}) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/front/api", "");

    if (path.startsWith("/church/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...churchDetails, ...overrides }),
      });
    }
    // Everything else (search, autocomplete, hits) gets an empty success so no
    // test depends on live data.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(Array.isArray(overrides.__list) ? overrides.__list : []),
    });
  });
}

async function openChurchCard(page: Page, overrides: Json = {}) {
  await stubApi(page, overrides);
  await page.goto(`/church/${CHURCH_UUID}`);
  await expect(
    page.getByText(churchDetails.name, { exact: false }).first(),
  ).toBeVisible();
}

test.describe("church card — contribution UI", () => {
  test("offers the in-app photo upload, not the legacy off-site link", async ({
    page,
  }) => {
    await openChurchCard(page);

    await expect(
      page.getByRole("button", { name: /Ajouter une photo des horaires/i }),
    ).toBeVisible();

    // 8574714 re-added this link on main; 6b357bb replaces it. If a bad merge
    // resolution ever brings it back, both would render.
    await expect(
      page.locator('a[href*="confessio.fr/paroisse"]'),
    ).toHaveCount(0);
  });

  test("rejects a non-image file", async ({ page }) => {
    await openChurchCard(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "horaires.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 not an image"),
    });

    await expect(page.getByText("Veuillez choisir une image.")).toBeVisible();
  });

  test("rejects an image over 10 Mo", async ({ page }) => {
    await openChurchCard(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });

    await expect(
      page.getByText("Image trop lourde (10 Mo maximum)."),
    ).toBeVisible();
  });
});

test.describe("church card — parish images", () => {
  test("hides an image that is already a parsing source", async ({ page }) => {
    const sourceUrl = "https://example.test/source-shot.jpg";
    const standaloneUrl = "https://example.test/parish-photo.jpg";

    await openChurchCard(page, {
      website: {
        ...churchDetails.website,
        images: [
          { public_url: sourceUrl, comment: null },
          { public_url: standaloneUrl, comment: null },
        ],
      },
      parsings: [{ image_url: sourceUrl, schedules_indices: [] }],
    });

    // The standalone image rendering proves the parish list rendered at all —
    // without it, the absence below would pass for the wrong reason.
    await expect(page.locator(`img[src="${standaloneUrl}"]`)).toHaveCount(1);
    // The source shot belongs to its schedule, where it carries the
    // schedule <-> source link; repeating it here is the bug 5977f0b fixed.
    await expect(page.locator(`img[src="${sourceUrl}"]`)).toHaveCount(0);
  });
});

test.describe("navigation modal", () => {
  test("the Android link is the last entry and carries the bottom rounding", async ({
    page,
  }) => {
    await stubApi(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();

    // Only the stacked list entries, not the footer's Github/Hozana links.
    const entries = page.locator("dialog a.bg-white");
    const androidLink = page.locator(
      "dialog a[href*='play.google.com/store/apps/details']",
    );

    await expect(androidLink).toBeVisible();
    await expect(androidLink).toHaveClass(/rounded-b-xl/);

    // b93930f moved the bottom rounding onto the new last entry; the previous
    // last entry must not keep it, or the list renders two rounded bottoms.
    await expect(
      page.locator("dialog a[href*='accounts/login']"),
    ).not.toHaveClass(/rounded-b-xl/);

    await expect(entries.last()).toHaveAttribute(
      "href",
      /play\.google\.com/,
    );
  });
});

test.describe("date handling", () => {
  // 0696d74: the prod server runs UTC while visitors are in Paris, so "today"
  // must not depend on the runtime zone or the SSR'd date UI mismatches on
  // hydration.
  //
  // Each case freezes the clock at an instant where that zone and Paris are on
  // different calendar days — otherwise the test would agree with a broken
  // implementation for most of the day. Europe/Paris is the control: it can
  // never diverge, so it must pass either way.
  const CASES = [
    {
      timezoneId: "UTC", // what the prod server runs
      frozen: "2026-09-05T22:30:00Z", // Paris 00:30 on the 6th, UTC still the 5th
      parisToday: "2026-09-06",
      thirdChipDay: "8", // Aujourd'hui 6, Demain 7, then 8
    },
    {
      timezoneId: "Pacific/Kiritimati", // UTC+14, a day ahead of Paris
      frozen: "2026-09-05T12:00:00Z", // Paris 14:00 on the 5th, Kiritimati the 6th
      parisToday: "2026-09-05",
      thirdChipDay: "7", // Aujourd'hui 5, Demain 6, then 7
    },
    {
      timezoneId: "Europe/Paris", // control
      frozen: "2026-09-05T22:30:00Z",
      parisToday: "2026-09-06",
      thirdChipDay: "8",
    },
  ] as const;

  for (const { timezoneId, frozen, parisToday, thirdChipDay } of CASES) {
    test(`"today" is anchored to Paris under ${timezoneId}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      await context.clock.setFixedTime(new Date(frozen));
      const page = await context.newPage();
      await stubApi(page);

      await page.goto("/");
      await expect(page.getByText("Aujourd'hui").first()).toBeVisible();

      // Sanity: the browser really is at the instant and zone we asked for.
      const anchored = await page.evaluate(
        () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }),
      );
      expect(anchored).toBe(parisToday);

      // The rail is "Tous les jours", "Aujourd'hui", "Demain", then
      // weekday + day-of-month. The third dated chip pins which day the rail
      // thinks it is — Paris-anchored, or the browser's own zone.
      const chips = await page.locator("[aria-pressed]").allTextContents();
      expect(chips.slice(0, 3)).toEqual([
        "Tous les jours",
        "Aujourd'hui",
        "Demain",
      ]);
      expect(chips[3]).toContain(thirdChipDay);

      await context.close();
    });
  }

  // Hydration needs its own case on the real clock: with the clock frozen only
  // in the browser, the server and client are genuinely at different instants
  // and a mismatch would be the test's own doing, not the app's.
  for (const timezoneId of ["UTC", "Pacific/Kiritimati", "America/Los_Angeles"]) {
    test(`the date UI hydrates without a mismatch under ${timezoneId}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await stubApi(page);

      const hydrationErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
          hydrationErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        if (/hydrat/i.test(err.message)) hydrationErrors.push(err.message);
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByText("Aujourd'hui").first()).toBeVisible();

      expect(hydrationErrors, "date UI mismatched on hydration").toEqual([]);
      await context.close();
    });
  }
});

test.describe("error routes", () => {
  test("an unknown diocese slug renders a 404, not a server error", async ({
    request,
  }) => {
    const res = await request.get("/diocese/zzz-not-real");
    expect(res.status()).toBe(404);
  });

  // Known, deferred: src/app/(map)/church/[uuid]/page.tsx calls fetchApi with no
  // notFound() guard, so a bad uuid throws and renders a 500. The diocese route
  // does guard. Carried as finding #4 since the 2026-07-18 QA run.
  test.fixme(
    "an unknown church uuid renders a 404, not a server error",
    async ({ request }) => {
      const res = await request.get(
        "/church/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status()).toBe(404);
    },
  );
});
