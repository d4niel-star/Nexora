# Nexora — Deploy Checklist (Render / staging / prod)

Este checklist resume, sin valores, qué variables hay que setear en el
proveedor de hosting antes de un go-live, y cómo validar cada
subsistema. Complementa `docs/PRODUCTION.md` (inventario canónico) y
`docs/RUNBOOK.md` (incidentes).

**Regla de oro**: nunca pegar el valor de un secret en un doc, ticket
o log. Usar el dashboard del provider (Render env group) para cargarlos.

---

## 1. Inventario de variables para Render

| Variable | Required | Uso | Acción |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Prisma (toda la app) | Internal URL de Postgres en Render |
| `ENCRYPTION_KEY` | ✅ | AES-256-CBC vault para tokens OAuth (MP/Ads/WhatsApp) | Generar con `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | OAuth redirects, emails, sitemap, MP back_urls/notification_url | URL pública https de la app |
| `CANONICAL_APP_HOST` | ✅ (feature) | Middleware canonical vs tenant custom domain | Apex host sin scheme |
| `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_APP_DOMAIN` | recomendado | Aliases legacy del host apex | Mismo valor que `CANONICAL_APP_HOST` |
| `MERCADOPAGO_BILLING_ACCESS_TOKEN` | ✅ | Cobros de suscripción a tenants (wallet plataforma) | Token real (no TEST-) del wallet MP Nexora |
| `MERCADOPAGO_ACCESS_TOKEN` | fallback | Token MP legacy single-tenant / debug | Opcional si ya está el billing token |
| `MP_CLIENT_ID` | ✅ | OAuth tenant → MP | Del panel MP devs |
| `MP_CLIENT_SECRET` | ✅ | OAuth tenant → MP | Del panel MP devs |
| `MP_WEBHOOK_SECRET` | ✅ | HMAC webhook storefront `/api/payments/mercadopago/webhook` | Secret configurado en el panel MP del webhook |
| `MERCADOPAGO_WEBHOOK_SECRET` | opcional | HMAC webhook billing `/api/webhooks/billing` | Configurar si MP lo exige en el panel billing |
| `CRON_SECRET` | ✅ | Shared secret de todos los crons | Random ≥ 32 chars (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | ✅ (prod) | Envío real de emails transaccionales | Key de Resend dashboard (prefix `re_`) |
| `RESEND_FROM_EMAIL` | ✅ (feature) | Remitente. Alias `EMAIL_FROM` aceptado | Dominio verificado en Resend |
| `NEXORA_OPS_EMAILS` | opcional | Allowlist observability cross-tenant | Emails ops separados por coma |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | opcional | IA real. Mock si faltan | Tokens de Anthropic / Google AI Studio |
| `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_DEVELOPER_TOKEN` | opcional | OAuth Google Ads | Deshabilita conexión si faltan |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | opcional | OAuth Meta Ads | Idem |
| `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` | opcional | OAuth TikTok Ads | Idem |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | opcional | Social login | Deshabilita botón si faltan |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_GA_ID` | opcional | Pixels client-side global | Según plan de analytics global |
| `GA_MEASUREMENT_ID`, `GA_MEASUREMENT_PROTOCOL_SECRET` | opcional | Eventos server-side a GA4 | Idem |
| `ABANDONED_CART_THRESHOLD_MINUTES` | opcional | Minutos de inactividad → abandono | Default `120` |
| `MOCK_LOGISTICS_SECRET` | opcional | HMAC del provider mock de logística (solo dev/demo) | — |
| `ENABLE_VERBOSE_AUDIT` | opcional | Audit verbose a stdout | `"1"` para habilitar, off en prod |

**Nota sobre sesiones**: el proyecto **no usa** `SESSION_SECRET` ni
`NEXTAUTH_SECRET`. Las sesiones son DB-backed con IDs crypto-aleatorios
(`src/lib/auth/session.ts` → `randomBytes(32)` en tabla `Session`). No
hace falta setearlo en Render.

---

## 2. Validar envs en el host (Render)

En el shell del servicio Render (o vía `render ssh`):

```bash
# Sin setear NODE_ENV manualmente — Render ya lo expone como "production".
NODE_ENV=production npx tsx scripts/check-envs.ts
```

El script devuelve:

- `exit 0` si todas las REQUIRED están presentes y no hay safety warnings.
- `exit 1` si falta alguna REQUIRED, hay token TEST- en billing, URL
  localhost en `NEXT_PUBLIC_APP_URL`, claves cortas, o `RESEND_API_KEY`
  no parece una key real de Resend.
- Banner inicial indica `MP mode: sandbox | live | unset`.

⚠️ En PowerShell local, NO dejar `NODE_ENV=production` persistente en
el shell: Next 16 rompe `next build` con "useContext of null" si
`NODE_ENV` queda seteado. El script lo documenta internamente.

---

## 3. Validar migrations

```bash
npx prisma migrate status       # debe reportar sin migraciones pendientes
npx prisma migrate deploy       # idempotente; aplica las pendientes
```

En Render estos comandos van en el `buildCommand` o en un hook
`postdeploy`. Nunca correr `migrate reset` en prod.

---

## 4. Validar Resend real

1. Confirmar `RESEND_API_KEY` seteado (check-envs → ok).
2. Confirmar dominio del `RESEND_FROM_EMAIL` (o `EMAIL_FROM`)
   verificado en el dashboard de Resend.
3. En admin → `/admin/communication` → ejecutar "Enviar prueba" a un
   email propio.
4. Confirmar en `EmailLog` que `provider="resend"` y `status="sent"`.
5. Forzar error controlado: borrar temporalmente `RESEND_API_KEY`, el
   `/admin/communication` test send debe fallar con mensaje claro
   (`MissingEmailApiKeyError`), no con success silencioso.

---

## 5. Validar Mercado Pago webhook

1. `MP_WEBHOOK_SECRET` seteado en Render y en el panel MP devs del
   webhook del storefront.
2. Endpoint:
   - `GET /api/payments/mercadopago/webhook` → no lo expone el
     código; la verificación la hace MP enviando `POST`.
   - `POST` sin `MP_WEBHOOK_SECRET` → responde 500
     `missing_webhook_secret`. MP reintenta, observar en logs.
   - `POST` con `x-signature` inválida → responde 401
     `invalid_signature`.
3. Flow real sandbox: crear preferencia de pago tenant con tarjeta
   test de MP, completar pago, y verificar que:
   - `SystemEvent` registra `mp_webhook_received`.
   - `Order.paymentStatus` pasa a `paid`.
   - `EmailLog(eventType=PAYMENT_APPROVED)` se crea y se entrega.

---

## 6. Validar cron jobs

Las rutas usan el header compartido `x-cron-secret`:

```bash
# Debe responder 503 sin secret
curl -X POST https://<host>/api/cron/abandoned-carts

# Debe responder 401 con secret incorrecto
curl -X POST -H "x-cron-secret: wrong" https://<host>/api/cron/abandoned-carts

# Debe responder 200 ok con el secret correcto (usar secret real)
curl -X POST -H "x-cron-secret: $CRON_SECRET" https://<host>/api/cron/abandoned-carts
```

Endpoints disponibles (todos con el mismo contrato de auth):

- `/api/cron/abandoned-carts`
- `/api/cron/dunning-reminders`
- `/api/cron/post-purchase-review-requests`
- `/api/cron/expire-pickup-reservations` (acepta `x-cron-secret` o
  `Authorization: Bearer <CRON_SECRET>`).

En Render Cron configurar cada uno con su intervalo y el header
correspondiente. `CRON_SECRET` debe ser el **mismo** en el servicio
web y en cada cron job.

---

## 7. Validar pixels / analytics

1. Admin → `/admin/ads` → configurar GA4, Meta, TikTok según
   disponibilidad.
2. Abrir storefront público en incógnito con DevTools → Network:
   - GA4: request a `google-analytics.com/g/collect` o
     `googletagmanager.com/gtag/js`.
   - Meta: request a `connect.facebook.net/.../fbevents.js` y
     `tr/` con `ev=PageView`.
   - TikTok: request a `analytics.tiktok.com/i18n/pixel/events.js`.
3. Confirmar no hay double-inserción de pixels cross-tenant.

---

## 8. Validar pickup reservation expiration

```bash
# 1. health check (sin efecto)
curl https://<host>/api/cron/expire-pickup-reservations
# → { "status": "cron_pickup_expire_active", "ttlMinutesDefault": 60 }

# 2. dry-run con secret correcto
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
     -H "content-type: application/json" \
     -d '{"dryRun":true}' \
     https://<host>/api/cron/expire-pickup-reservations

# 3. CLI (en Render shell)
npx tsx scripts/expire-pickup-reservations.ts --dry-run
npx tsx scripts/smoke-pickup-expiration.ts   # ejecuta escenarios contra la DB
```

La política es:

- Sólo procesa orders con `shippingMethod.type = "pickup"`.
- Sólo vencen las que siguen en `pending` y fuera de la ventana TTL.
- No toca orders `paid` / `cancelled`.
- Restaura `LocalInventory.stock` sólo si hubo decremento previo
  registrado en `SystemEvent` (idempotente).

---

## 9. Validar carrier integration

1. Admin → `/admin/shipping` → conectar carrier soportado.
2. `readiness.items[id=delivery_carrier].status = "complete"` cuando
   `StoreCarrierConnection.status = "connected"`.
3. Probar cotización y creación de etiqueta con una orden de prueba.
4. Confirmar que los tokens se guardan cifrados en DB (vía
   `encryptToken` — requiere `ENCRYPTION_KEY` real).

---

## 10. Criterio de go-live

El go-live queda aprobado cuando:

- ✅ `NODE_ENV=production npx tsx scripts/check-envs.ts` pasa con exit 0.
- ✅ `npx prisma migrate status` sin pendientes.
- ✅ `npm run build` sin errores.
- ✅ Test send real llega a un email del equipo.
- ✅ Compra sandbox MP completa con webhook aprobado en logs.
- ✅ Readiness de la tienda operativa marca ≥ 1 método de pago,
  ≥ 1 producto publicado, ≥ 1 método de entrega.
- ✅ Al menos un cron ejecutado con éxito (abandoned-carts o
  expire-pickup-reservations).
- ✅ No hay secrets en logs, en UI, ni en git.

Si algún item falla, resolver antes de habilitar tráfico real. Nunca
declarar RC "aprobado con advertencias" cuando falta algún fail-closed.
