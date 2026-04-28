// scripts/verify-render-canvas.mjs
// Headless browser audit against the live Render deploy.
// 1) Open the deploy with an authenticated session cookie.
// 2) Navigate to /admin/dashboard and /admin/stats.
// 3) Read the resolved computed style of --studio-canvas and the
//    actual background-color of the canvas element.
// 4) Save full-page screenshots so we have proof of what a real
//    browser sees (i.e. not just what the CSS bundle declares).

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const ORIGIN = "https://nexora-p62h.onrender.com";
const COOKIE_VALUE =
  "75c539bbd9db2bd762e355f79dc5adddd278aa057f61263551ddbb1e9032407e";

const TARGETS = [
  { path: "/admin/dashboard", file: "dashboard" },
  { path: "/admin/stats", file: "stats" },
  { path: "/admin/catalog", file: "catalog" },
];

const OUT_DIR = "verification-screenshots";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Inject the auth cookie scoped to the Render domain.
  await context.addCookies([
    {
      name: "nx_session",
      value: COOKIE_VALUE,
      domain: "nexora-p62h.onrender.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const results = [];

  for (const target of TARGETS) {
    const url = ORIGIN + target.path;
    console.log(`\n→ Navigating to ${url}`);
    const resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    const status = resp?.status();
    console.log(`  status: ${status}`);

    // Give CSS / hydration a moment.
    await page.waitForTimeout(1500);

    // Read computed values straight from the live DOM.
    const audit = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const main = document.querySelector("main");
      const mainBg = main ? getComputedStyle(main).backgroundColor : null;
      const body = document.body;
      const bodyBg = body ? getComputedStyle(body).backgroundColor : null;
      // Look for the Studio v4 panel and check it's still white.
      const panel = document.querySelector(".nx-panel, .nx-stat-row, .nx-table-shell");
      const panelBg = panel ? getComputedStyle(panel).backgroundColor : null;
      return {
        title: document.title,
        studioCanvas: root.getPropertyValue("--studio-canvas").trim(),
        studioPaper: root.getPropertyValue("--studio-paper").trim(),
        studioLine: root.getPropertyValue("--studio-line").trim(),
        bodyBg,
        mainBg,
        panelBg,
        url: location.href,
      };
    });

    console.log("  audit:", JSON.stringify(audit, null, 2));

    const file = `${OUT_DIR}/${target.file}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  saved → ${file}`);

    results.push({ target: target.path, status, ...audit, screenshot: file });
  }

  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SUMMARY");
  console.log("══════════════════════════════════════════════════════════");
  for (const r of results) {
    const ok =
      r.studioCanvas.toLowerCase() === "#eceef2" &&
      r.studioPaper.toLowerCase() === "#ffffff";
    console.log(
      `${ok ? "✓" : "✗"} ${r.target.padEnd(20)} canvas=${r.studioCanvas} paper=${r.studioPaper} main-bg=${r.mainBg}`,
    );
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
