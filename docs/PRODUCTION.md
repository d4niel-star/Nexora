# Nexora — Producción: inventario de envs y fail modes

Tabla canónica de cada variable de entorno que el código consume, qué
subsistema depende de ella, qué pasa si falta, y si el sistema **falla
cerrado** (rechaza operar, seguro) o **degrada honestamente** (sigue
funcionando con feature desactivada y un warn/log explícito).

Complementa:

- `.env.example` — template para copiar a `.env`.
- `docs/RUNBOOK.md` — playbook de incidentes y rollback.

---

## Clasificación

- **REQUIRED**: sin esta env el sistema no puede funcionar correctamente
  en producción. El módulo afectado falla cerrado.
- **OPTIONAL**: la feature correspondiente queda desactivada sin ruido;
  el resto del sistema sigue operando.
- **REQUIRED-FOR-FEATURE**: la feature asociada rompe sin el env, pero
  el resto del producto continúa.

---

## 1. Core (REQUIRED)

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `DATABASE_URL` | Prisma (todo) | Conexión Postgres | Prisma tira al inicio. **Fail-closed**. |
| `ENCRYPTION_KEY` | `src/lib/security/token-crypto.ts` | AES-256-CBC vault para tokens OAuth | **Producción: throw al cargar módulo** (fail-closed). Dev: warn + fallback determinista. |
| `NEXT_PUBLIC_APP_URL` | OAuth redirects, emails, sitemap, JSON-LD, MP `back_urls` y `notification_url` | URL pública del app | Fallback a `http://localhost:3000` en varios callsites. En prod rompe callbacks/emails/links pero no tira el proceso. **Degrada mal**, revisar en pre-deploy. |
| `CANONICAL_APP_HOST`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_APP_DOMAIN` | `src/proxy.ts` (middleware) | Decide canonical vs tenant custom domain | Middleware usa heurísticas sobre `host`. Custom domains de tenants fallan, el resto funciona. |

---

## 2. Mercado Pago

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `MERCADOPAGO_BILLING_ACCESS_TOKEN` | `src/lib/billing/mp-env.ts`, `src/lib/billing/mercadopago.ts`, `src/app/api/webhooks/billing/route.ts` | Token MP del wallet plataforma para cobrar suscripciones Nexora | **Fail-closed**: throw `MissingMpAccessTokenError` al intentar crear preferencia; webhook loguea `mp_webhook_missing_token` y 500 (MP reintenta). |
| `MERCADOPAGO_ACCESS_TOKEN` | mismo | Fallback del anterior | Si tampoco está, fail-closed como arriba. |
| `MERCADOPAGO_WEBHOOK_SECRET` | `src/app/api/webhooks/billing/route.ts` | HMAC opcional para billing webhook | **Opt-in**: si está seteado, se valida `x-signature`; si no, se omite (el webhook ya re-fetchea el pago desde MP, lo cual es el trust boundary real). |
| `MP_CLIENT_ID` | `src/lib/payments/mercadopago/tenant.ts`, OAuth | OAuth client para flow tenant-MP | **Fail-closed** al refrescar token: throw explícito. Flows nuevos de OAuth tenant rompen con mensaje claro. |
| `MP_CLIENT_SECRET` | idem | Secret del OAuth client | idem |
| `MP_WEBHOOK_SECRET` | `src/app/api/payments/mercadopago/webhook/route.ts` | HMAC **requerido** para webhook storefront | **Fail-closed**: si falta, webhook retorna 500; MP reintenta indefinidamente. Debe estar seteado antes del go-live. |

---

## 3. Cron jobs

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `CRON_SECRET` | `src/app/api/cron/*/route.ts` | Shared secret entre scheduler y app | **Fail-closed**: cron responde 503 `{"error":"cron_secret_not_configured"}` y no ejecuta side effects. |
| `ABANDONED_CART_THRESHOLD_MINUTES` | `/api/cron/abandoned-carts` | Minutos de inactividad antes de considerar abandono | Default `120`. |

---

## 4. Email (OPTIONAL — degrada a Mock)

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `RESEND_API_KEY` | `src/lib/email/providers/index.ts` | API key Resend | **Degrada**: `MockProvider` activa con warn loud. EmailLog se escribe pero no se entrega. |
| `RESEND_FROM_EMAIL` | idem | Remitente | Default `Nexora <noreply@nexora.app>`. |

---

## 5. Observabilidad y ops

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `NEXORA_OPS_EMAILS` | `src/lib/auth/ops.ts`, `/admin/billing/observability` | Allowlist de emails que ven observability cross-tenant | **Fail-closed**: sin env → nadie es ops → la surface renderiza 404 para todos. |
| `ENABLE_VERBOSE_AUDIT` | `src/lib/observability/audit.ts` | Emite eventos no-críticos a stdout | Off por default; ya se loguea siempre `severity in (error, critical)`. |

---

## 6. IA (OPTIONAL — degrada a Mock)

| Variable | Consumido por | Qué hace | Si falta |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `src/lib/ai/builder/anthropic-provider.ts` | Claude builder/chat | **Degrada**: `MockBuilderProvider` con contenido determinista. |
| `GEMINI_API_KEY` | `src/lib/ai/builder/gemini-provider.ts` | Gemini builder/chat | idem |
| `AI_PROVIDER`, `AI_PROVIDER_DEFAULT` | bootstrap | Selector de provider activo | Sin esto, el orden es Gemini → Anthropic → Mock. |
| `AI_MODEL` | gemini-provider | Override de modelo | Default `gemini-3.1-pro-preview`. |

---

## 7. Ads OAuth (OPTIONAL — ads disable if unset)

| Variable | Consumido por | Si falta |
|---|---|---|
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` / `GOOGLE_DEVELOPER_TOKEN` | `src/lib/ads/oauth/google.ts`, `sync/actions.ts` | Throw explícito al intentar conectar/sincronizar Google Ads. |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | `src/lib/ads/oauth/meta.ts` | idem Meta |
| `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET` | `src/lib/ads/oauth/tiktok.ts` | idem TikTok |

---

## 8. Analytics (OPTIONAL)

| Variable | Consumido por | Si falta |
|---|---|---|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `src/components/analytics/AnalyticsScripts.tsx` | Sin script de Plausible. |
| `NEXT_PUBLIC_GA_ID` | idem | Sin script de GA4. |
| `GA_MEASUREMENT_ID` / `GA_MEASUREMENT_PROTOCOL_SECRET` | `src/lib/analytics/server-events.ts` | Sin eventos server-side a GA4. Degrada silenciosamente. |

---

## 9. Logistics (OPTIONAL — sólo mock)

| Variable | Consumido por | Si falta |
|---|---|---|
| `MOCK_LOGISTICS_SECRET` | `src/lib/logistics/providers/mock.ts` | Fallback a `"mock-secret"` literal — solo usado en demo/dev. |

---

## Matriz de fail-closed vs degrade

| Subsistema | Fail-closed | Degrade |
|---|---|---|
| DB (DATABASE_URL) | ✅ | — |
| Token vault (ENCRYPTION_KEY, prod) | ✅ | — |
| Billing MP token | ✅ | — |
| Storefront MP webhook HMAC | ✅ | — |
| Cron secret | ✅ | — |
| OAuth tenant (MP/Ads) | ✅ | — |
| Ops observability gate | ✅ | — |
| Email (Resend) | — | ✅ |
| IA (Anthropic/Gemini) | — | ✅ |
| Analytics (GA/Plausible) | — | ✅ |
| Billing webhook HMAC (opcional) | — | ✅ |
| App URL | — | ⚠️ (rompe callbacks pero no tira proceso — validar en pre-deploy) |

---

## Chequeo automático

El script `scripts/check-envs.ts` lee estas envs del entorno actual y
reporta cuáles están ausentes con su severidad. Correrlo antes de
cualquier deploy:

```bash
npx tsx scripts/check-envs.ts
# exit 0 → OK, todas las REQUIRED están presentes.
# exit 1 → falta al menos una REQUIRED, revisar output.
```
