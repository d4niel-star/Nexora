-- Drift fix: schema.prisma declared these columns but production DB never
-- had them, causing Prisma P2022 (ColumnNotFound) at runtime in
-- /admin/sourcing, /admin/ai (provider-score + payment-token readers)
-- and any other reader that touched these relations.
-- All operations here are strictly additive (ADD COLUMN with NULLable types),
-- no data migration or destructive change.

-- ProviderConnection: encrypted credentials vault (same pattern used by
-- StorePaymentProvider and AdPlatformConnection).
ALTER TABLE "ProviderConnection" ADD COLUMN "apiKeyEncrypted" TEXT;

-- StorePaymentProvider: OAuth token lifecycle fields added in a prior
-- schema rev but whose migration was never persisted.
ALTER TABLE "StorePaymentProvider" ADD COLUMN "lastError" TEXT;
ALTER TABLE "StorePaymentProvider" ADD COLUMN "lastRefreshedAt" TIMESTAMP(3);
ALTER TABLE "StorePaymentProvider" ADD COLUMN "refreshTokenEncrypted" TEXT;
ALTER TABLE "StorePaymentProvider" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
