// Pre-deploy env checker.
//
// Safe to run in CI:
//   NODE_ENV=production npx tsx scripts/check-envs.ts
//
// This script never prints env values. It only reports names, statuses,
// modes and warnings derived from the shared safe inventory.
import "dotenv/config";

import {
  ENV_INVENTORY,
  checkEnvVars,
  isEnvSpecSatisfied,
} from "@/lib/env/check-envs";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREY = "\x1b[90m";
const RESET = "\x1b[0m";

const result = checkEnvVars(process.env);
const nodeEnv = process.env.NODE_ENV || "development";

console.log(`\nNexora env check - NODE_ENV=${nodeEnv} - MP mode: ${result.mpMode}\n`);

for (const spec of ENV_INVENTORY) {
  const set = isEnvSpecSatisfied(process.env, spec);
  const label = set ? `${GREEN}[ok ]${RESET}` : `${RED}[   ]${RESET}`;
  const severity =
    spec.severity === "required"
      ? `${RED}REQ${RESET}`
      : spec.severity === "required-for-feature"
        ? `${YELLOW}FEAT${RESET}`
        : `${GREY}opt${RESET}`;

  console.log(
    `${label} ${severity}  ${spec.name.padEnd(40)} ${GREY}${spec.subsystem}${RESET}  ${spec.notes}`,
  );
}

if (result.details.safetyWarnings.length > 0) {
  console.log(`\n${YELLOW}Safety warnings:${RESET}`);
  for (const warning of result.details.safetyWarnings) {
    console.log(`  ${YELLOW}!${RESET}  ${warning}`);
  }
}

console.log(`\nSummary: ${result.details.setCount}/${result.details.total} envs set.`);
console.log(`  required missing: ${result.details.missingRequired.length}`);
console.log(`  feature  missing: ${result.details.missingFeature.length}`);
console.log(`  optional missing: ${result.details.missingOptional.length}`);
console.log(`  safety warnings: ${result.details.safetyWarnings.length}`);
console.log(`  email provider ready: ${result.emailProviderReady ? "yes" : "no"}`);
console.log(`  app url production-like: ${result.appUrlLooksProduction ? "yes" : "no"}`);

if (result.details.missingRequired.length > 0) {
  console.log(`\n${RED}Missing REQUIRED:${RESET}`);
  for (const name of result.details.missingRequired) console.log(`  - ${name}`);
}

if (result.details.missingFeature.length > 0) {
  console.log(`\n${YELLOW}Missing REQUIRED-FOR-FEATURE:${RESET}`);
  for (const name of result.details.missingFeature) console.log(`  - ${name}`);
}

if (nodeEnv === "production") {
  if (result.ok) {
    console.log(`\n${GREEN}OK:${RESET} production env inventory passes.`);
    process.exit(0);
  }

  console.log(`\n${RED}FAIL:${RESET} production env inventory is incomplete or unsafe.`);
  process.exit(1);
}

if (result.details.missingRequired.length > 0) {
  console.log(
    `\n${YELLOW}Non-production:${RESET} ${result.details.missingRequired.length} required env(s) missing. Set before deploying to production.`,
  );
} else {
  console.log(`\n${GREEN}OK:${RESET} every REQUIRED env is present.`);
}

process.exit(0);
