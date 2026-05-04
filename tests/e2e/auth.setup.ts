import "dotenv/config";

import { test as setup, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Auth setup (storageState) ──────────────────────────────────────────
//
// This file runs once before any spec. Instead of driving the login form
// (which redirects through email verification + plan selection and is
// therefore hostile to test stability), we mint a session row directly
// in the dev DB and write a Playwright `storageState` cookie file.
//
// Hard guarantees:
//   · Refuses to run with NODE_ENV=production. The QA user, store
//     mutation and session creation are all dev-only.
//   · No real password is ever printed. We hash a random per-run
//     placeholder so the User row has a syntactically-valid password
//     hash; the test never logs in via that hash.
//   · Idempotent: repeated runs upsert the user/subscription rather
//     than duplicating rows. Old sessions for the QA user are deleted
//     so we never leak credentials across runs.
//
// Required envs:
//   DATABASE_URL must be set (loaded from .env via dotenv).

const STORAGE_STATE = "tests/e2e/.auth/admin.json";
const QA_EMAIL = "e2e-admin@nexora.dev";
const SESSION_COOKIE = "nx_session";

function hashPassword(password: string): string {
  // Mirrors src/app/home/auth-actions.ts so that the User row passes
  // the production password verifier. We never use this hash to log in
  // in tests — sessions are minted directly — but writing a real hash
  // keeps the row honest if the QA user is ever exercised manually.
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

setup("authenticate as QA admin", async ({}, testInfo) => {
  // Sanity: refuse production. The setup mutates the DB.
  if (process.env.NODE_ENV === "production") {
    throw new Error("[auth.setup] Refusing to run with NODE_ENV=production.");
  }

  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("[auth.setup] DATABASE_URL is not set. Cannot mint a QA session.");
  }

  // Mirror the production client (src/lib/db/prisma.ts): hosted
  // Postgres providers like Render require SSL on external
  // connections. Local Postgres does not.
  const isRemote =
    !rawConnectionString.includes("localhost") &&
    !rawConnectionString.includes("127.0.0.1");
  const connectionString =
    isRemote && !rawConnectionString.includes("sslmode=")
      ? `${rawConnectionString}${rawConnectionString.includes("?") ? "&" : "?"}sslmode=require`
      : rawConnectionString;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Find any active store (preferred) or fall back to the first store
    // by createdAt. Tests are read-only against this store except where
    // they exercise the UI of pages that already render no-op.
    const store =
      (await prisma.store.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, name: true },
      })) ??
      (await prisma.store.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, name: true },
      }));

    if (!store) {
      throw new Error(
        "[auth.setup] No store found in the dev DB. Run prisma seed or create-demo-user before running E2E.",
      );
    }

    // Upsert the QA user. Verified email so the admin layout doesn't
    // bounce us. storeId points at the resolved store; that's how
    // getCurrentStore() resolves the active tenant.
    const user = await prisma.user.upsert({
      where: { email: QA_EMAIL },
      create: {
        email: QA_EMAIL,
        password: hashPassword(`e2e-${randomBytes(8).toString("hex")}`),
        name: "Nexora E2E Admin",
        emailVerified: true,
        storeId: store.id,
      },
      update: {
        emailVerified: true,
        storeId: store.id,
      },
      select: { id: true },
    });

    // Ensure an active subscription so resolvePostAuthDestination()
    // routes to /admin/dashboard. We don't pick a plan price — we
    // upsert against whatever plan is already seeded for this store
    // or fall back to the "core" plan; the only invariant we rely on
    // is `status === "active"` (or "trialing").
    const corePlan =
      (await prisma.plan.findUnique({ where: { code: "core" } })) ??
      (await prisma.plan.findFirst({ orderBy: { createdAt: "asc" } }));

    if (!corePlan) {
      throw new Error(
        "[auth.setup] No Plan rows found. Seed plans (initializeStoreBilling) before running E2E.",
      );
    }

    await prisma.storeSubscription.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        planId: corePlan.id,
        status: "active",
      },
      update: {
        status: "active",
      },
    });

    // Wipe stale QA sessions before issuing a fresh one. Sessions for
    // other users are untouched.
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const sessionId = randomBytes(32).toString("hex");
    // 30-day expiry so getCurrentUser() never enters its rolling-refresh
    // branch (<15 days remaining) during the test run. That branch would
    // otherwise hit cookies().set(), which can throw in RSC contexts
    // before the read-only fallback in session.ts kicks in.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
      },
    });

    // Build a Playwright-shaped storage state with just the session
    // cookie. baseURL host is what the tests will run against.
    const baseURL = (testInfo.project.use.baseURL as string | undefined) ?? "http://localhost:3000";
    const url = new URL(baseURL);

    const storageState = {
      cookies: [
        {
          name: SESSION_COOKIE,
          value: sessionId,
          domain: url.hostname,
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax" as const,
          expires: Math.floor(expiresAt.getTime() / 1000),
        },
      ],
      origins: [],
    };

    const targetPath = STORAGE_STATE;
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, JSON.stringify(storageState, null, 2), "utf-8");

    expect(sessionId).toHaveLength(64);
  } finally {
    await prisma.$disconnect();
  }
});
