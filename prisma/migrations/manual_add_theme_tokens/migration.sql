-- Manual migration: add tokensJson and activePreset to StoreTheme
-- Run this against your database when the connection is available.
-- Both columns are nullable — zero risk to existing rows.

ALTER TABLE "StoreTheme" ADD COLUMN IF NOT EXISTS "activePreset" TEXT;
ALTER TABLE "StoreTheme" ADD COLUMN IF NOT EXISTS "tokensJson" TEXT;
