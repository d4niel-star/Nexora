// Smoke test for /admin/store/local — runs a real Chromium against the
// dev server with the merchant cookie, navigates each tab, screenshots
// the result and reports whether the key UI affordances render.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const ORIGIN = "http://localhost:3000";
const COOKIE_VALUE = "75c539bbd9db2bd762e355f79dc5adddd278aa057f61263551ddbb1e9032407e";
const OUT_DIR = "verification-screenshots/local-store";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    {
      name: "nx_session",
      value: COOKIE_VALUE,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });

  const url = `${ORIGIN}/admin/store/local`;
  console.log(`→ goto ${url}`);
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  console.log(`  status: ${resp?.status()}`);

  await page.waitForTimeout(1500);

  // Confirm key surfaces
  const checks = await page.evaluate(() => {
    const hasHeader = !!Array.from(document.querySelectorAll("h1")).find(
      (n) => n.textContent?.toLowerCase().includes("local f"),
    );
    const tabs = Array.from(document.querySelectorAll(".nx-tab")).map(
      (t) => t.textContent?.trim() ?? "",
    );
    const sidebarLink = !!Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/admin/store/local",
    );
    const statRow = !!document.querySelector(".nx-stat-row");
    const panels = document.querySelectorAll(".nx-panel").length;
    return { hasHeader, tabs, sidebarLink, statRow, panels };
  });
  console.log("  checks:", JSON.stringify(checks, null, 2));

  await page.screenshot({ path: `${OUT_DIR}/01-profile.png`, fullPage: true });

  // Click each tab and screenshot
  const tabLabels = ["Retiro en tienda", "Stock local", "Venta presencial", "Caja diaria"];
  for (let i = 0; i < tabLabels.length; i++) {
    const label = tabLabels[i];
    const clicked = await page.evaluate((labelInner) => {
      const btn = Array.from(document.querySelectorAll(".nx-tab")).find(
        (t) => t.textContent?.trim().includes(labelInner),
      );
      if (btn) {
        (btn).click();
        return true;
      }
      return false;
    }, label);
    console.log(`  tab "${label}" clicked: ${clicked}`);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT_DIR}/0${i + 2}-${label.replace(/[^a-z]+/gi, "-").toLowerCase()}.png`,
      fullPage: true,
    });
  }

  console.log("\nConsole errors:");
  if (consoleErrors.length === 0) console.log("  (none)");
  else consoleErrors.forEach((e) => console.log("  " + e));

  await browser.close();
  console.log(`\nDONE → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
