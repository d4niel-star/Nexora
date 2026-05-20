-- ═══════════════════════════════════════════════════════════════════════
-- CREATE ADMIN ACCOUNT — Run in Render PSQL shell
-- Email:    admin@nexora.com
-- Password: nexora123
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_store_id TEXT;
  v_user_id TEXT;
  v_plan_id TEXT;
BEGIN
  -- 1. Upsert Store
  INSERT INTO "Store" (id, slug, name, status, currency, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'nexora-admin', 'Nexora Admin', 'active', 'ARS', NOW(), NOW())
  ON CONFLICT (slug) DO UPDATE SET status = 'active', "updatedAt" = NOW()
  RETURNING id INTO v_store_id;

  RAISE NOTICE 'Store ID: %', v_store_id;

  -- 2. Upsert User
  INSERT INTO "User" (id, email, password, name, "emailVerified", "storeId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'admin@nexora.com',
    '21aec4af0b4d341105fa4544d606f42b:0be4e34ffb062256571121dc510c199792253cf59ccd2b8b6b444ae325dd05ee42fac60993413d6fa9e7f686db065f9011ef1c2f706108dfd9845cfaf981a3bb',
    'Admin',
    true,
    v_store_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "emailVerified" = true,
    "storeId" = v_store_id,
    "updatedAt" = NOW()
  RETURNING id INTO v_user_id;

  RAISE NOTICE 'User ID: %', v_user_id;

  -- 3. Ensure Plan exists
  INSERT INTO "Plan" (id, code, name, "monthlyPrice", "configJson", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'growth',
    'Growth',
    0,
    '{"maxProducts":9999,"maxCollections":100,"aiCredits":500,"features":["ai_builder","visual_editor","analytics","automations","custom_domain"]}',
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_plan_id FROM "Plan" WHERE code = 'growth' LIMIT 1;

  RAISE NOTICE 'Plan ID: %', v_plan_id;

  -- 4. Upsert Subscription (active)
  INSERT INTO "StoreSubscription" (id, "storeId", "planId", status, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_store_id, v_plan_id, 'active', NOW(), NOW())
  ON CONFLICT ("storeId") DO UPDATE SET status = 'active', "updatedAt" = NOW();

  -- 5. Upsert Onboarding (completed)
  INSERT INTO "StoreOnboarding" (id, "storeId", "currentStage", "completedStepsJson", "activationScore", "hasPublished", "hasUsedAI", "hasImportedProduct", "hasConnectedOAuth")
  VALUES (gen_random_uuid()::text, v_store_id, 'completed', '["welcome","products","branding","payments","launch"]', 100, true, true, true, false)
  ON CONFLICT ("storeId") DO UPDATE SET "currentStage" = 'completed', "activationScore" = 100, "hasPublished" = true;

  -- 6. Clear stale sessions
  DELETE FROM "Session" WHERE "userId" = v_user_id;

  RAISE NOTICE '✅ Admin account ready! Login: admin@nexora.com / nexora123';
END $$;
