# Nexora

Infraestructura para ecommerce inteligente.

## Getting Started

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database

This project uses **PostgreSQL** via Prisma ORM.

### Local Development

Set `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nexora_dev"
```

Then:

```bash
npx prisma generate
npx prisma db push
```

### Production

Requires a PostgreSQL instance (e.g., Render PostgreSQL, Supabase, Neon, AWS RDS).

## Environment Variables

### Required for Production

```env
# Database (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@host:5432/nexora"

# Application URL (used for email verification links, payment callbacks, OAuth redirects)
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# Multi-tenant routing (root domain for proxy)
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
```

### Email Delivery (Resend)

```env
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=Nexora <noreply@yourdomain.com>
```

- **With `RESEND_API_KEY` set**: Uses `ResendProvider` — real email delivery.
- **Without `RESEND_API_KEY`**: Falls back to `MockProvider` — logs to console, **NO real email delivery**.

**Prerequisites for real email**:
1. Create account at [resend.com](https://resend.com) and obtain API key.
2. Verify sending domain in Resend dashboard.
3. Set `RESEND_FROM_EMAIL` with verified domain.
4. Set `NEXT_PUBLIC_APP_URL` to production URL.

### Payments (Mercado Pago) — Storefront checkout

```env
MP_CLIENT_ID=your_mp_oauth_client_id
MP_CLIENT_SECRET=your_mp_oauth_client_secret
MP_WEBHOOK_SECRET=your_mp_webhook_secret
ENCRYPTION_KEY=32_plus_chars_for_token_encryption
```

Checkout uses tenant-owned Mercado Pago accounts. Access tokens are stored encrypted per store in `StorePaymentProvider`; do not use a global access token for storefront checkout. Without a connected store credential, the checkout remains disabled for that store.

## Deploy on Render

### 1. Create PostgreSQL Database

Create a PostgreSQL instance on Render. Copy the **Internal Database URL**.

### 2. Create Web Service

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20+
- **Health Check Path**: `/api/system/health`

### 3. Environment Variables on Render

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string from Render |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Full public URL (e.g., `https://app.yourdomain.com`) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | **Yes** | Root domain for multi-tenant proxy (e.g., `yourdomain.com`) |
| `RESEND_API_KEY` | **Yes** for email | Resend API key |
| `RESEND_FROM_EMAIL` | **Yes** for email | Verified sender (e.g., `Nexora <noreply@yourdomain.com>`) |
| `MP_CLIENT_ID` | Yes for MP OAuth | Mercado Pago OAuth app client ID |
| `MP_CLIENT_SECRET` | Yes for MP OAuth | Mercado Pago OAuth app client secret |
| `MP_WEBHOOK_SECRET` | Yes for MP checkout | Secret used to validate Mercado Pago webhook signatures |
| `ENCRYPTION_KEY` | Yes for token storage | Key used to encrypt tenant payment tokens in DB |
| `NODE_ENV` | Auto | Render sets this to `production` automatically |

### 4. Initialize Database

After first deploy, run in Render Shell:

```bash
npx prisma db push
```

This creates all tables in the PostgreSQL database.

### 5. Multi-Tenant Routing

The proxy (`src/proxy.ts`) handles routing:
- `app.yourdomain.com` → Admin panel (`/admin/*`)
- `yourdomain.com` → Landing pages (`/home/*`)
- `store-slug.yourdomain.com` → Storefronts

Configure DNS accordingly.

## Data Migration (SQLite → PostgreSQL)

If you have existing data in a SQLite database (e.g., `dev.db`) and want to preserve it:

### 1. Prerequisites

- PostgreSQL database created and accessible via `DATABASE_URL`
- Tables created with `npx prisma db push`
- SQLite source file available locally

### 2. Run Migration

```bash
# Set env vars (or use .env file)
SQLITE_PATH=./dev.db DATABASE_URL=postgresql://user:pass@host:5432/nexora npm run migrate:data
```

### 3. What It Migrates

All 47 Nexora tables in correct FK dependency order:
- **Core**: Store, User, Session, EmailVerificationToken
- **Commerce**: Product, ProductVariant, ProductImage, Collection, CollectionProduct
- **Orders**: Cart, CartItem, CheckoutDraft, Order, OrderItem, Payment
- **Inventory**: StockMovement, ShippingMethod
- **AI**: AIGenerationDraft, AIGenerationProposal, AIConversation, AIMessage, AIUsageLog
- **Billing**: Plan, StoreSubscription, BillingTransaction, StoreCreditBalance, CreditTransaction
- **Sourcing**: SourcingProvider, ProviderConnection, ProviderProduct, CatalogMirrorProduct
- **Supplier**: SupplierOrder, SupplierOrderItem, ProviderSyncJob
- **Config**: StoreBranding, StoreTheme, StoreNavigation, StorePage, StoreBlock, StorePublishSnapshot, StoreDomain
- **Onboarding**: StoreOnboarding
- **Legal/Fiscal**: StoreLegalSettings, WithdrawalRequest, FiscalProfile, FiscalInvoice
- **Ads**: AdPlatformConnection, AdCampaignDraft, AdCampaignProduct, AdRecommendation, AdInsightSnapshot
- **System**: SystemEvent, CarrierWebhookLog, EmailLog

### 4. Features

- **Idempotent**: Uses `ON CONFLICT DO NOTHING` — safe to re-run
- **Boolean conversion**: SQLite 0/1 → PostgreSQL true/false automatically
- **Validation**: Compares row counts per table after migration
- **Error reporting**: Per-table error counts, exits with code 1 on failures

### 5. Validation

The script automatically compares row counts between SQLite source and PostgreSQL target after migration. All counts should match.

### 6. Limitations

- Schema must be identical (same Prisma schema, just different provider)
- `_prisma_migrations` table is NOT migrated (Prisma manages it separately)
- QA databases (`dev.qa.db`) are not automatically included — run separately if needed
- Passwords are migrated as-is (bcrypt/scrypt hashes are DB-agnostic)

## Go-Live Checklist

After deploying to Render:

- [ ] `DATABASE_URL` set and database initialized with `prisma db push`
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `NEXT_PUBLIC_ROOT_DOMAIN` set for multi-tenant routing
- [ ] `/api/system/health` returns 200
- [ ] `/home` (landing) loads correctly
- [ ] `/home/login` works — can log in
- [ ] `/home/register` works — creates account
- [ ] Email verification email arrives (requires `RESEND_API_KEY` + verified domain)
- [ ] Admin dashboard loads after login
- [ ] Inventory page loads
- [ ] Catalog page loads
- [ ] AI Hub loads
- [ ] Command Center renders directives
- [ ] Variant deep-links work from dashboard
- [ ] Logout redirects to `/home/login`
