-- Nexora monetization consolidation: collapse 4 plans (core, growth, scale,
-- enterprise) into 3 (core, growth, scale). Enterprise is retired as an
-- operational plan. Any existing subscription that points at the enterprise
-- Plan row is reassigned to Scale — Scale is a strict superset of
-- Enterprise's functional entitlements under the new packaging, so no
-- tenant loses capabilities.
--
-- The enterprise Plan row itself is ARCHIVED, not deleted, so that
-- historical BillingTransaction.planId foreign keys remain valid. The new
-- seedPlans() only upserts the 3 active plans, so no new subscription can
-- ever land on the archived row again.

-- 1. Reassign any StoreSubscription currently on a non-canonical plan
--    (e.g. legacy 'enterprise', 'pro', 'starter', 'free') to 'scale'.
--    Scale is a strict superset of the functional entitlements of any of
--    those legacy rows, so no tenant loses capabilities.
UPDATE "StoreSubscription"
SET "planId" = (SELECT id FROM "Plan" WHERE code = 'scale' LIMIT 1)
WHERE "planId" IN (
  SELECT id FROM "Plan"
  WHERE code NOT IN ('core', 'growth', 'scale')
);

-- 2. Archive every non-canonical Plan row (kept for FK integrity of
--    historical BillingTransaction.planId references; excluded from
--    operational queries via status='archived').
UPDATE "Plan"
SET status = 'archived'
WHERE code NOT IN ('core', 'growth', 'scale');
