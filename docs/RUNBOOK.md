# Nexora — Runbook operativo

Documento de operación mínimo para el equipo que opera Nexora en producción.
No es observabilidad enterprise; es la ruta corta para diagnosticar y resolver
los incidentes reales que el producto puede generar.

Documentos relacionados:

- `.env.example` — template canónico de variables de entorno.
- `docs/PRODUCTION.md` — inventario de envs con fail-mode por cada una.
- `VALIDATION_CHECKLIST.md` — checklist histórico de 13 pasos post-deploy.

---

## 1. Pre-deploy checklist

Ejecutar **en este orden** antes de prometer cualquier deploy productivo.

### 1.1 Código

- [ ] `git status --short` limpio en la rama a deployar.
- [ ] `git branch --show-current` → `main`.
- [ ] `npx tsc --noEmit -p tsconfig.json` sale con exit `0`.
- [ ] `npm run build` sale con exit `0`, sin errores de Prisma ni de Next.

### 1.2 Migraciones

- [ ] `npx prisma migrate deploy` aplicado contra la DB productiva sin errores.
- [ ] `npx prisma migrate status` reporta "database schema is up to date".

### 1.3 Variables de entorno

- [ ] `npx tsx scripts/check-envs.ts` sale con exit `0`.
- [ ] Cada clave marcada REQUIRED en `.env.example` existe en el entorno real.
- [ ] `ENCRYPTION_KEY` **no** es el fallback de dev, tiene 32 bytes hex reales
      y está versionada en el secret manager del runtime.
- [ ] `MERCADOPAGO_BILLING_ACCESS_TOKEN` **no** es un TEST token (no empieza
      con `TEST-`).
- [ ] `CRON_SECRET` y `MP_WEBHOOK_SECRET` son aleatorios ≥ 32 chars.
- [ ] `NEXT_PUBLIC_APP_URL` apunta al dominio público real (https), no a
      localhost.

### 1.4 Dependencias externas

- [ ] MercadoPago panel: URL del webhook `/api/payments/mercadopago/webhook`
      apunta al dominio productivo y el HMAC secret coincide con
      `MP_WEBHOOK_SECRET`.
- [ ] MercadoPago panel: URL del webhook de billing
      `/api/webhooks/billing` apunta al dominio productivo; si
      `MERCADOPAGO_WEBHOOK_SECRET` está seteado, el secret coincide.
- [ ] Cron scheduler (Render Cron Job / GitHub Actions / etc.) programado para:
  - `POST /api/cron/abandoned-carts` cada 30 min.
  - `POST /api/cron/dunning-reminders` cada 4 h.
  - `POST /api/cron/post-purchase-review-requests` cada 6 h.
  - Todos con header `x-cron-secret: <CRON_SECRET>`.
- [ ] Resend: dominio verificado + `RESEND_FROM_EMAIL` aprobado para envío.
- [ ] Render: disco persistente montado en `/public/uploads` (logos de
      tiendas).

---

## 2. Post-deploy checklist

Ejecutar inmediatamente después de que el deploy termine.

### 2.1 Sanity

- [ ] `GET /api/cron/abandoned-carts` responde `200 {"status":"cron_abandoned_carts_active"}`.
- [ ] `GET /api/cron/post-purchase-review-requests` responde `200`.
- [ ] `GET /` responde `200`.
- [ ] `GET /home/pricing` responde `200` y muestra los 3 planes con precios
      20.000 / 59.000 / 119.000 ARS.
- [ ] `GET /sitemap.xml` responde `200` y lista al menos una tienda activa.

### 2.2 Auth

- [ ] Login con una cuenta existente funciona end-to-end.
- [ ] Acceso a `/admin/dashboard` exige sesión; redirect correcto cuando no
      la hay.
- [ ] `/admin/billing/observability` con sesión no-ops → `404`.

### 2.3 Billing real

- [ ] En `/admin/billing` el plan actual muestra el código correcto y el
      precio coincide con `PLAN_DEFINITIONS`.
- [ ] Un upgrade a plan superior redirige a MercadoPago con una URL
      productiva (init_point con dominio `mercadopago.com`, no sandbox).
- [ ] El webhook de billing (`POST /api/webhooks/billing` sin `data.id`)
      responde `200` (ack silencioso para eventos no-payment).

### 2.4 Crons activos

Disparar manualmente cada cron con el secret real y confirmar:

```bash
curl -X POST "$APP_URL/api/cron/abandoned-carts" \
  -H "x-cron-secret: $CRON_SECRET" | jq
```

- [ ] `abandoned-carts` → `{"ok":true, "scanned":..., "sent":..., ...}`.
- [ ] `dunning-reminders` → `{"success":true, "troubled":..., "sent":..., ...}`.
- [ ] `post-purchase-review-requests` → `{"ok":true, "tenantsEvaluated":..., ...}`.

### 2.5 Observabilidad mínima

- [ ] `SystemEvent` tiene entradas recientes (últimos 10 min).
- [ ] Ningún `severity=critical` sin resolver.

---

## 3. Incidentes típicos — primeros pasos

> **Regla de oro**: antes de mutar producción, mirar `SystemEvent` filtrado
> por `severity in (error, critical)` de los últimos 60 minutos. El 80% de
> los incidentes deja evidencia ahí sin necesidad de grep de logs.

### 3.1 Billing webhook no procesa pagos

**Síntomas**: upgrades aprobados en MP pero el plan sigue en el estado
anterior; la tabla `BillingTransaction` queda con `status=pending`.

1. Buscar `eventType` recientes en `SystemEvent`:
   - `mp_webhook_missing_token` → H1 a resolver: setear
     `MERCADOPAGO_BILLING_ACCESS_TOKEN` o `MERCADOPAGO_ACCESS_TOKEN`.
   - `mp_webhook_fetch_failed` → MP API caída o token inválido; revisar
     `metadata.status`. Si `401/403`: rotar token. Si `5xx`: status page de MP.
   - `mp_webhook_signature_rejected` → secret mal sincronizado: regenerar
     `MERCADOPAGO_WEBHOOK_SECRET` en el panel MP **y** en el env del runtime.
2. MP reintenta automáticamente los 502/500. No hace falta reprocesar manual
   si sólo hubo ventana corta de error.
3. Si `BillingTransaction` quedó `pending` más de 1 h después de restaurar
   el servicio, reprocesar manualmente:
   `POST /api/webhooks/billing?data.id=<paymentId>` (necesita el mismo
   `MERCADOPAGO_WEBHOOK_SECRET` si estaba configurado — usar firma real
   desde el panel MP "Reenviar evento").

### 3.2 Un cron devuelve 503

**Síntomas**: llamadas al cron con `status=503 {"error":"cron_secret_not_configured"}`.

1. `CRON_SECRET` no está seteado en el runtime. Agregarlo y redeploy.
2. Si devuelve `401 {"error":"unauthorized"}`: el header `x-cron-secret` no
   coincide con la env. Revisar el scheduler (Render Cron / GitHub Actions).

### 3.3 Un cron ejecuta pero no envía emails

1. Verificar `RESEND_API_KEY` seteada; si no, el provider cae a `MockProvider`
   y logea `[Email] RESEND_API_KEY not set — using MockProvider`. Los emails
   **se registran** en `EmailLog` pero **no se entregan**.
2. Si está seteada pero igual no hay entrega: revisar `EmailLog.errorMessage`
   para los últimos fails; correlacionar con status de Resend
   (https://resend.com/).
3. Cuenta de Resend: dominio aún no verificado → todos los emails a
   destinatarios fuera del dominio propio son rechazados. Verificar dominio.

### 3.4 Tenant no puede upgradear plan

1. En `SystemEvent` buscar por `storeId` del tenant; ver si hay
   `billing_payment_failed` reciente.
2. Si el tenant está en `past_due` o `unpaid`: el banner de dunning
   aparece globalmente en `/admin/*`; lo que ve el tenant es correcto.
   El camino normal es pagar desde la UI (el botón "Resolver pago" genera
   una nueva preferencia MP).
3. Si el tenant dice que pagó y el estado no cambió: buscar el
   `external_reference` de la `BillingTransaction` más reciente y verificar
   manualmente con MP (el panel lista los pagos por external_reference).

### 3.5 Falla una app premium (post-purchase, whatsapp, bundles, reviews)

**Principio**: las apps premium fallan cerradas a propósito si:

- el tenant está en un plan que no las incluye (`planConfig.<flag> !== true`),
- la app no está instalada o no está `active`, o
- la subscripción no está `active`/`trialing`.

1. Confirmar en `/admin/apps` el estado real del tenant; no es bug, es gate.
2. Si el tenant sí tiene entitlement pero la app no corre:
   - **whatsapp-recovery**: `SystemEvent` con
     `abandoned_cart_whatsapp_failed|crash` contiene el error del provider.
     Credenciales WABA se configuran por tenant en
     `/admin/apps/whatsapp-recovery/setup`.
   - **post-purchase-flows**: mirar `EmailLog` para `POST_PURCHASE_REVIEW_REQUEST`
     / `POST_PURCHASE_REORDER_FOLLOWUP`; si hay pending/failed con error:
     Resend down o delay-days mal configurado.

### 3.6 `/admin/billing/observability` devuelve 404 para alguien de ops

1. Agregar el email del operador a `NEXORA_OPS_EMAILS` (comma-separated).
   No requiere redeploy: si el runtime lee env dinámicamente, basta con
   reiniciar el proceso.
2. Si el email ya está ahí y sigue 404: verificar que la sesión esté autenticada
   (el gate corre después de la autenticación).

---

## 4. Rollback path

### 4.1 Rollback de código

- El repo es single-branch (`main`) con deploy automático. Para volver a la
  versión previa estable:
  ```bash
  git log --oneline -n 10
  git revert <commit-sha>     # preserva historia
  git push origin main
  ```
- Alternativa si el runtime soporta snapshots (Render, Vercel): usar la
  UI para promover el build anterior. Es más rápido que un revert + rebuild.

### 4.2 Rollback de migración

- **Nunca** borrar filas de `_prisma_migrations` a mano para "desaplicar".
  Crear una migración nueva que revierta el schema y aplicarla con
  `prisma migrate deploy`.
- Si una migración recién aplicada rompió datos:
  1. Bajar tráfico admin.
  2. Crear migración `202XXXXXXXXXX_revert_<name>` con el DDL inverso.
  3. Aplicar con `prisma migrate deploy`.
  4. Volver a subir tráfico.

### 4.3 Rollback de config

- Si un cambio de env causa el incidente (rotación de key mal hecha, token
  inválido), revertir la env al valor anterior y reiniciar el proceso;
  el código ya está en runtime — no hace falta rebuild.

### 4.4 Datos sensibles

- **`ENCRYPTION_KEY` rotación**: nunca cambiar sin un job de migración que
  descifre con la key vieja + recifre con la nueva. Si la rotación se hizo
  sin ese paso, los tokens OAuth quedaron inutilizables → revertir la env
  a la key anterior y reconectar las cuentas afectadas si es necesario.

---

## 5. Operaciones rutinarias

### 5.1 Ver estado del sistema en 30 segundos

```sql
-- Suscripciones en problema
SELECT status, COUNT(*) FROM "StoreSubscription"
 WHERE status IN ('past_due','unpaid','trial_expired','cancelled')
 GROUP BY status;

-- Fallos de pago última hora
SELECT * FROM "SystemEvent"
 WHERE severity IN ('error','critical')
   AND "createdAt" > now() - interval '1 hour'
 ORDER BY "createdAt" DESC LIMIT 50;

-- Cola de emails estancada
SELECT status, COUNT(*) FROM "EmailLog"
 WHERE "createdAt" > now() - interval '24 hours'
 GROUP BY status;
```

### 5.2 Reintentar un webhook MP perdido

Desde el panel de MercadoPago (Desarrolladores → Notificaciones → Historial
de eventos), seleccionar el evento y hacer click en "Reenviar". Nexora
lo procesará idempotentemente (el webhook hace `findFirst` por
`externalReference` y no duplica transacciones).

### 5.3 Forzar un estado limpio para un tenant

```sql
-- Solo después de verificar con MP que el pago está real.
UPDATE "StoreSubscription"
   SET status = 'active'
 WHERE "storeId" = '<uuid>';
```

Después: `DELETE FROM "EmailLog" WHERE "storeId" = '<uuid>' AND "entityType" = 'billing';`
para que la próxima alerta de dunning vuelva a correr limpia.

---

## 6. Contactos y escalación

- Issues de código / defectos en producción → abrir issue en GitHub
  `d4niel-star/Nexora` con label `production-incident`.
- Problemas con MercadoPago → panel de desarrolladores + soporte MP.
- Problemas con Resend → status.resend.com + soporte Resend.
