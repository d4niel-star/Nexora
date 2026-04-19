-- Nexora Apps V3.3 · Real click tracking for post-purchase-flows emails.
-- Adds a counter + timestamp on EmailLog. Nullable timestamp keeps
-- legacy rows untouched. clickCount defaults to 0 so reads are safe.
ALTER TABLE "EmailLog"
  ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastClickedAt" TIMESTAMP(3);
