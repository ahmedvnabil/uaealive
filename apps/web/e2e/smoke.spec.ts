import { expect, test } from "@playwright/test";

test.describe("UAE ALIVE smoke", () => {
  test("landing renders Arabic RTL hero", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main h1")).toContainText("الفهيدي");
  });

  test("landing renders English LTR", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("main h1")).toBeVisible();
  });

  test("map mounts and ?poi= deep link opens the drawer", async ({ page }) => {
    await page.goto("/ar/map?poi=coffee-museum");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("متحف القهوة").first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("story page offers narration and audience variants", async ({
    page,
  }) => {
    await page.goto("/en/stories/coffee-museum");
    await expect(page.locator("main h1")).toBeVisible();
    // Tourist story of every POI has pre-rendered audio → player always shows.
    await expect(
      page.getByRole("button", { name: "Listen to the story" }),
    ).toBeVisible();
    // Audience toggle exposes the three variants.
    await expect(page.getByRole("button", { name: /Kids|Expert/ })).toHaveCount(
      2,
    );
  });

  test("character chat round-trips a streamed reply", async ({ page }) => {
    await page.goto("/ar/characters");
    // Character cards are buttons inside the grid; open the first one.
    await page
      .getByRole("button")
      .filter({ hasText: "سالم" })
      .first()
      .click();
    const input = page.getByPlaceholder("اكتب سؤالك هنا…");
    await expect(input).toBeVisible();
    await input.fill("مرحبا");
    await page.getByRole("button", { name: "أرسل" }).click();
    // The user bubble appears immediately…
    await expect(page.getByText("مرحبا").last()).toBeVisible();
    // …and the stream must finish without surfacing the error message.
    await expect(page.getByText("تعذّر إرسال الرسالة")).toHaveCount(0);
    await expect(page.locator("[role=status]")).toHaveCount(0, {
      timeout: 45_000,
    });
  });

  test("hunt rejects a wrong code with an error state", async ({ page }) => {
    await page.goto("/ar/hunt");
    await page
      .getByRole("button", { name: "وصلت! أدخل الرمز" })
      .first()
      .click();
    // Segmented 6-box code entry — focus the first box and type through.
    await page.getByRole("textbox", { name: "الخانة 1 من 6" }).click();
    await page.keyboard.type("XXXXXX");
    await page.getByRole("button", { name: "تحقق من الرمز" }).click();
    await expect(page.getByText("الرمز غير صحيح", { exact: false })).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test("events page lists seeded events", async ({ page }) => {
    await page.goto("/en/events");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main ol > li")).toHaveCount(7);
    await expect(page.getByText("Calligraphy Season", { exact: false })).toBeVisible();
  });

  test("copilot streams a personalized tour", async ({ page }) => {
    await page.goto("/en/copilot");
    await page.getByRole("button", { name: "Architecture" }).click();
    await page.getByRole("button", { name: "Plan my tour" }).click();
    // A multi-stop itinerary appears (live LLM or offline fallback, both fine).
    await expect(page.locator("main article ol > li").first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText("Couldn't reach the copilot")).toHaveCount(0);
  });
});
