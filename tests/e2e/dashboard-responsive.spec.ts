import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

loadDotEnv();

const { prisma } = await import("../../server/db/client");
const { hashSessionToken } = await import("../../server/auth/tokens");
const sessionCookieName = "aegis_session";

function loadDotEnv() {
  try {
    const envFile = readFileSync(".env", "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      process.env[key] ??= value;
    }
  } catch {
    // The responsive smoke tests skip when no local database environment exists.
  }
}

async function createAdministratorSession(page: Page) {
  const administrator = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
    where: { role: "ADMINISTRATOR", status: "ACTIVE" },
  });

  test.skip(!administrator, "Missing active administrator account.");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      expiresAt,
      tokenHash,
      userId: administrator!.id,
    },
  });

  await page.context().addCookies([
    {
      expires: Math.floor(expiresAt.getTime() / 1000),
      httpOnly: true,
      name: sessionCookieName,
      sameSite: "Lax",
      url: "http://127.0.0.1:3000",
      value: token,
    },
  ]);

  return tokenHash;
}


function collectHydrationConsoleErrors(page: Page) {
  const errors: string[] = [];
  const pattern = /hydrated|hydration|server rendered HTML/i;

  page.on("console", message => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    if (pattern.test(text)) {
      errors.push(text);
    }
  });

  page.on("pageerror", error => {
    if (pattern.test(error.message)) {
      errors.push(error.message);
    }
  });

  return errors;
}
async function expectNoDocumentOverflow(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;

    return {
      bodyScrollWidth: body.scrollWidth,
      rootScrollWidth: root.scrollWidth,
      viewportWidth: root.clientWidth,
    };
  });
  const maxScrollWidth = Math.max(
    overflow.bodyScrollWidth,
    overflow.rootScrollWidth
  );

  expect(
    maxScrollWidth,
    `document overflow: ${JSON.stringify(overflow)}`
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test.describe("authenticated dashboard responsiveness", () => {
  let tokenHash: string | undefined;

  test.beforeEach(async ({ page }) => {
    tokenHash = await createAdministratorSession(page);
  });

  test.afterEach(async () => {
    if (tokenHash) {
      await prisma.session.deleteMany({ where: { tokenHash } });
      tokenHash = undefined;
    }
  });

  for (const route of ["/overview", "/operational-data", "/analytics", "/users"] as const) {
    test(`${route} has no document-level horizontal overflow`, async ({
      page,
    }) => {
      const hydrationErrors = collectHydrationConsoleErrors(page);

      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectNoDocumentOverflow(page);
      expect(hydrationErrors, `hydration errors on ${route}`).toEqual([]);
    });
  }
  test("overview and operational data use tablet-safe controls", async ({
    page,
  }) => {
    const hydrationErrors = collectHydrationConsoleErrors(page);

    await page.setViewportSize({ width: 820, height: 1180 });

    for (const route of ["/overview", "/operational-data"] as const) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectNoDocumentOverflow(page);

      if (route === "/overview") {
        await expect(page.getByTestId("asset-performance-list")).toBeVisible();
        await expect(page.getByTestId("asset-performance-table")).toBeHidden();
      }
    }

    expect(hydrationErrors, "hydration errors on tablet dashboard routes").toEqual(
      [],
    );
  });
});
