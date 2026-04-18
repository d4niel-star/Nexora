# Nexora — Checklist de validación en vivo (10/10)

Ejecutar en este orden tras desplegar a staging con `.env` completo.
Cada paso trae el **comando/ruta exacta** y el **resultado esperado**.

---

## 0. Pre-flight

- [ ] `npx prisma migrate deploy` aplicado sin errores.
- [ ] `npx tsc --noEmit` limpio (ya validado en CI).
- [ ] `.env` copiado de `.env.example`; todas las claves marcadas REQUIRED rellenas.
- [ ] `ENCRYPTION_KEY` generada con `openssl rand -hex 32` y NO reutilizada entre entornos.

## 1. AI Builder (P1)

- [ ] Con `ANTHROPIC_API_KEY` vacío: crear tienda desde `/onboarding` → debe usar el MockBuilderProvider (contenido determinista, sin error).
- [ ] Con la key seteada: generar ficha de producto en `/admin/products/.../ai` → respuesta debe ser texto Claude (no mock), latencia < 10s.
- [ ] Forzar 401 (key mala): se muestra error estructurado `AIBuilderError`, no stack trace crudo.

## 2. Mercado Pago OAuth + refresh (P2)

- [ ] `/admin/settings/payments` → "Conectar Mercado Pago" abre MP → autorizar → redirige con `?status=connected`.
- [ ] En DB: `StorePaymentProvider` tiene `accessToken`, `refreshToken` y `tokenExpiresAt` cifrados (no legibles en texto plano).
- [ ] Simular token expirado: editar `tokenExpiresAt` a `now() - 1h` y hacer un checkout. El helper `getMercadoPagoCredentialsForStore` debe refrescar el token automáticamente y seguir el checkout.
- [ ] Revocar acceso desde MP → próximo checkout marca el provider como `needs_reconnect` y no intenta silenciosamente.

## 3. Subida de logo (P3)

- [ ] `POST /api/uploads/store-logo` con JPEG de 500KB → 200, archivo persistido en `/public/uploads/<storeId>/logo.*`.
- [ ] Con archivo de 3MB → 400 (`file_too_large`).
- [ ] Con PDF → 400 (`unsupported_mime_type`).
- [ ] En Render: confirmar que `/public/uploads` está montado en disco persistente (ver `.gitignore` — carpeta excluida del repo).

## 4. Vault de credenciales de sourcing (P4)

- [ ] Conectar un proveedor en `/admin/sourcing/providers` → revisar en DB `ProviderConnection.apiKey`: debe ser `v1:<iv>:<ciphertext>` (formato AES).
- [ ] Ningún log (`logSystemEvent`, `console.*`) debe imprimir el valor en claro. Buscar en logs de staging: `grep -i "apiKey\|api_key"` no debe devolver valores.

## 5. Race condition de stock (P5)

- [ ] Crear producto con `stock=1`, `trackInventory=true`, `allowBackorder=false`.
- [ ] Ejecutar 2 webhooks MP concurrentes para 2 órdenes distintas de ese producto:
  ```bash
  for i in 1 2; do curl -X POST <url>/api/payments/mercadopago/webhook -d @payload$i.json & done; wait
  ```
- [ ] Resultado: exactamente 1 orden con `paymentStatus=paid` y stock 0; la otra queda con la excepción `insufficient_stock_at_commit` en `logSystemEvent`. Nunca stock negativo.

## 6. Mobile-first (P6)

- [ ] Chrome DevTools → Moto G4 (360×640). Abrir `/store/<slug>/products/<id>` y `/store/<slug>/checkout`.
- [ ] Inputs: altura ≥ 44px, `font-size ≥ 16px` (no zoom al hacer focus en iOS).
- [ ] Lighthouse mobile: Accessibility ≥ 95, Best Practices ≥ 95.

## 7. Billing limits + trial (P7)

- [ ] Registrar tenant nuevo → `StoreSubscription.plan = growth`, `status = trialing`, `trialEndsAt = +14d`.
- [ ] Exceder límites del plan Core (ej. 51er producto en plan Core) → 403 `plan_limit_reached`.
- [ ] Adelantar `trialEndsAt` a ayer → próxima petición server action debe marcar `status = past_due` y bloquear features premium.
- [ ] AI Builder en plan Core: feature gate debe negar acceso con mensaje claro.

## 8. Emails operativos (P8)

- [ ] Completar una orden real → dueño recibe **ORDER_PAID_OWNER**, cliente recibe **PAYMENT_APPROVED**.
- [ ] En DB: `EmailLog` tiene 2 filas con `status = sent`.
- [ ] Re-disparar el mismo webhook → no se envían duplicados (idempotencia (eventType, entityType, entityId)).
- [ ] Vender la última unidad de un variant con `stock = reorderPoint` → dueño recibe **STOCK_CRITICAL** (1 por orden).
- [ ] Marcar orden como `shipped` desde `/admin/orders/...` → cliente recibe **ORDER_SHIPPED**.

## 9. SEO (P9)

- [ ] `GET /sitemap.xml` → 200 XML con `<loc>` por tienda activa y por producto publicado.
- [ ] `GET /robots.txt` → referencia correcta a `<NEXT_PUBLIC_APP_URL>/sitemap.xml`, disallow `/admin /api /checkout`.
- [ ] Página de producto: ver código fuente → un `<script type="application/ld+json">` con `"@type":"Product"`, `offers.price`, `offers.availability` correctos.
- [ ] Home de tienda: JSON-LD con `"@type":"Store"`.
- [ ] Validar con https://search.google.com/test/rich-results: 0 errores, 1 item detectado por página de producto.

## 10. Analytics (P10)

- [ ] **Sin** `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`: el HTML NO incluye scripts de tracking (ver `view-source:`).
- [ ] **Con** `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`: el script `plausible.io/js/script.js` aparece en `<head>`; panel Plausible recibe pageviews.
- [ ] Con `GA_MEASUREMENT_ID` + `GA_MEASUREMENT_PROTOCOL_SECRET`: cerrar una orden → evento `purchase` aparece en GA4 DebugView en < 1 min.
- [ ] Configurar cron (Render Cron Job / GitHub Actions) apuntando a:
  ```
  POST <NEXT_PUBLIC_APP_URL>/api/cron/abandoned-carts
  header: x-cron-secret: <CRON_SECRET>
  cadence: */30 * * * *
  ```
  Tras 2h de carrito inactivo con email capturado → llega **ABANDONED_CART** y el carrito pasa a `status = abandoned`.

## 11. Middleware de dominio custom (P11)

- [ ] Tenant: en `/admin/settings/domains` agregar `shop.tenant.com`. Fila `StoreDomain` queda `status = pending`.
- [ ] DNS: crear CNAME `shop.tenant.com -> <CANONICAL_APP_HOST>`. Una vez propagado, flipear `status` a `active` (manual por ahora).
- [ ] `curl -H "Host: shop.tenant.com" https://<render-url>/` → devuelve la home del storefront del tenant, pero la URL visible conserva `shop.tenant.com`.
- [ ] `curl https://<CANONICAL_APP_HOST>/` → sigue siendo la app de admin/marketing (no se reescribe).
- [ ] Dominio no registrado → middleware deja pasar, Next responde 404 estándar.

## 12. Variables de entorno (P12)

- [ ] `diff .env.example <(cut -d= -f1 .env | sort -u)` → cero faltantes en prod.
- [ ] Ninguna key termina con valor placeholder (`""`) para las marcadas REQUIRED.

## 13. Smoke end-to-end (P13)

Simular una compra real con cuenta de prueba MP:

1. [ ] Onboarding completo → tienda en estado `active`, plan en `trialing`.
2. [ ] Subir logo, publicar producto con stock 2.
3. [ ] Desde storefront: agregar al carrito, completar checkout con tarjeta de prueba MP APRO.
4. [ ] Tras webhook aprobado, verificar:
   - orden `paymentStatus=paid`
   - stock decrementado a 1
   - email cliente + dueño en bandeja
   - evento `purchase` en GA4 (si configurado)
5. [ ] Abrir `/admin/command-center` → directivas reflejan la venta en "Ingresos 30d" y "Top sellers".
6. [ ] Marcar orden como `shipped` con tracking → email `ORDER_SHIPPED` con link.

---

## Configuraciones manuales pendientes (externas al código)

Estas NO pueden automatizarse desde el repo y requieren acción humana / panel
externo una vez desplegado:

1. **Mercado Pago Developers** — alta de aplicación OAuth, copiar
   `MP_CLIENT_ID` / `MP_CLIENT_SECRET`, registrar `redirect_uri`:
   `https://<app>/api/payments/mercadopago/oauth/callback`.
2. **Mercado Pago Webhook** — registrar URL
   `https://<app>/api/payments/mercadopago/webhook` y copiar secret a
   `MP_WEBHOOK_SECRET`.
3. **Render Disk** — crear disco persistente montado en `/public/uploads`
   (logos de tiendas). Sin esto, los archivos se pierden en cada deploy.
4. **Render Cron Job** — programar `POST /api/cron/abandoned-carts` cada 30
   min con header `x-cron-secret`.
5. **Resend** — dominio verificado y `RESEND_FROM_EMAIL` aprobado para envío.
6. **Anthropic** — key con créditos; monitorear uso en el dashboard.
7. **Google Analytics 4** — crear property, copiar Measurement ID y
   generar Measurement Protocol secret (Admin → Data Streams → Web → API Secrets).
8. **DNS por tenant** — cada tenant añade CNAME a `CANONICAL_APP_HOST`.
   Render/Netlify debe tener el dominio agregado a la lista de "custom
   domains" para que el certificado SSL se emita automáticamente.
9. **`ENCRYPTION_KEY`** — rotar exige re-cifrar credenciales existentes;
   planificar downtime o tarea de migración si alguna vez hay que cambiarla.
10. **GitHub Secrets / Render Env** — todas las claves de `.env.example`
    cargadas como variables del entorno de producción, NUNCA commiteadas.
