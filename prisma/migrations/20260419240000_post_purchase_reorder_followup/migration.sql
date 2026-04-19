-- Nexora Apps V3.4 · Second flow in post-purchase-flows: reorder follow-up.
-- Extends the existing per-tenant settings row with two fields. Defaults
-- are safe: the flow is OFF until the merchant turns it on.
ALTER TABLE "PostPurchaseFlowsSettings"
  ADD COLUMN "reorderFollowupEnabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reorderFollowupDelayDays" INTEGER NOT NULL DEFAULT 30;
