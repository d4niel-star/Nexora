# Especificación de Producto y Arquitectura Frontend: Plataforma SaaS de Dropshipping

Esta especificación detalla la arquitectura de interfaz de usuario, sistema de diseño y estructura de producto para una plataforma de dropshipping B2B2C moderna. El objetivo es crear una experiencia minimalista, premium y altamente conversiva, operando bajo un stack de **React / Next.js**.

## 1. Visión del Producto y Principios UX/UI

*   **Aplicación Moderna, no solo "Web":** Transiciones fluidas, sin recargas completas (SPA feel), retroalimentación instantánea (optimistic UI).
*   **Minimalismo Premium:** Mucho espacio en blanco (whitespace), tipografía clara y sin adornos innecesarios. Bordes sutiles, sombras suaves, desenfoque de fondo (glassmorphism sutil).
*   **Claridad sobre Densidad:** Mejor forzar al usuario a hacer scroll o clics claros que abrumarlo con paneles complejos de datos.
*   **Fricción Cero en Onboarding y Checkout:** Las dos métricas clave del sistema. Cero distracciones.
*   **Lenguaje Visual Consistente:** Reutilización estricta de componentes.

### Identidad Visual y Design Tokens

*   **Tipografía:** Inter, Roboto o Geist (sans-serif geométricas, modernas y de alta legibilidad).
    *   Headings: Peso Bold/Semibold, tracking ajustado.
    *   Body: Regular/Medium, alto contraste.
*   **Paleta de Colores (Theme):**
    *   *Primary:* Negro puro (`#000000`) o Gris muy oscuro (`#111827`) para un look premium técnico.
    *   *Accent:* Un color vibrante para conversión (ej. Azul Eléctrico `#2563EB` o Violeta `#7C3AED`).
    *   *Surface:* Blanco (`#FFFFFF`) para tarjetas.
    *   *Background:* Gris extremadamente tenue (`#F9FAFB` o `#F3F4F6`) para separar contenido.
    *   *Borders:* Gris muy claro (`#E5E7EB`).
    *   *Semantic:* Success (Verde esmeralda), Warning (Ámbar), Error (Rojo carmesí), Info (Azul).
*   **Spacing System (Base 4px/8px):** Extra Small (4px), Small (8px), Medium (16px), Large (24px), XL (32px), 2XL (48px), 3XL (64px).
*   **Grid System:** Grid de 12 columnas fluido. Gap base de 16px o 24px. Contenedor máximo para web pública de 1200px. Paneles fluidos (100% width) para SaaS Admin.
*   **Radii (Bordes):** Consistencia estricta. `sm` (4px) para inputs/botones, `md` (8px) para tarjetas/modales, `full` (9999px) para avatares/píldoras.

---

## 2. Estructura del Producto (Las 3 Capas)

### Capa 1: Web Pública (Marketing & Adquisición)
El escaparate del SaaS. Su objetivo es convertir visitantes en usuarios registrados.
*   **Páginas:**
    *   `Landing Page:` Hero section fuerte, propuesta de valor clara, features, testimonios, CTA rápido.
    *   `Precios (Pricing):` Tablas simples, planes claros (Free tier, Pro, Enterprise).
    *   `Login / Registro:` Minimalista, centrado. Opciones SSO (Google).
*   **Layout:** Header transparente que se vuelve sólido con el scroll. Footer estructurado.

### Capa 2: App Interna (SaaS Admin / Backoffice del Vendedor)
Donde el dropshipper gestiona su negocio. Requiere alta usabilidad para tareas complejas.
*   **Layout:** Sidebar expansible/colapsable (navegación principal), Topbar (acciones globales, notificaciones, perfil).
*   **Secciones Principales:**
    *   `Dashboard (Home):` Visión general (KPIs de ventas, tareas pendientes, atajos rápidos).
    *   `Catálogo & Importación:` Buscar productos base, importar a "Mis Productos".
    *   `Mis Productos / Inventario:` Listado de productos activos en *su* tienda, edición de precios (markup), descripciones.
    *   `Pedidos (Orders):` Ciclo de vida del pedido (Nuevo -> Pago -> Procesando -> Enviado -> Entregado).
    *   `Clientes:` CRM básico de los compradores finales.
    *   `Storefront (Constructor):` Personalización simple del look & feel de su tienda.
    *   `Configuración:` Pagos (Stripe/MercadoPago), Envíos, Dominios, Facturación del SaaS.

### Capa 3: Tienda Online del Cliente Final (Storefront)
La web donde compran los clientes del dropshipper. Generada dinámicamente y de alto rendimiento (SSR/SSG).
*   **Layout:** Header simple (Logo, Buscador, Carrito), Footer (Políticas, Enlaces).
*   **Secciones:**
    *   `Home de la Tienda:` Banners, productos destacados, categorías.
    *   `Listado de Categoría (PLP):` Grilla de productos, filtros simples (precio, variantes).
    *   `Página de Producto (PDP):` Galería grande, título, precio claro, selector de variantes, botón grande "Añadir al Carrito", descripción, reviews.
    *   `Carrito (Drawer):` Deslizante desde la derecha, evita sacar al usuario del contexto de compra. Muestra subtotal y botón al checkout.
    *   `Checkout Flow:` Flujo de 1 o 2 pasos. Limpio, validación estricta de inputs, sin distracciones.

---

## 3. Arquitectura Frontend y Convenciones (Next.js / React)

### Estructura de Carpetas Ideal (Next.js App Router)
```text
src/
├── app/                      # Rutas de la aplicación (Next.js App Router)
│   ├── (public)/             # Capa 1: Web Pública (Marketing)
│   │   ├── page.tsx          # Landing page
│   │   ├── pricing/          # Página de precios
│   │   └── login/            # /login
│   ├── (admin)/              # Capa 2: SaaS Admin
│   │   ├── layout.tsx        # Dashboard layout (Sidebar + Topbar)
│   │   ├── admin/            # Ej: /admin/dashboard
│   │   ├── products/         # Ej: /admin/products
│   │   └── orders/           # Ej: /admin/orders
│   ├── [store]/              # Capa 3: Storefront (Dynamic Tenant Routing)
│   │   ├── layout.tsx        # Storefront Layout
│   │   ├── page.tsx          # Store Home
│   │   ├── p/[slug]/         # Product Detail Page
│   │   └── checkout/         # Checkout flow
├── components/               # Componentes React
│   ├── ui/                   # Core UI / Sistema de Diseño (Botones, Inputs, Cards) - Independientes del negocio
│   ├── admin/                # Componentes específicos del SaaS Admin (Sidebar, DataTables, Charts)
│   ├── storefront/           # Componentes del Storefront (ProductCard, CartDrawer)
│   └── shared/               # Compartidos entre vistas
├── lib/                      # Utilidades, configuración, clientes de API
│   ├── api/                  # Axios/Fetch wrappers
│   ├── utils.ts              # Funciones helper (clsx, formatDates, formatCurrency)
│   └── constants.ts          # Configuración estática
├── hooks/                    # Custom React Hooks (useCart, useAuth, useClickOutside)
├── store/                    # Estado global (Zustand o Context API)
├── styles/                   # CSS Global, Tailwind config
└── types/                    # Tipos de TypeScript compartidos
```

### Convenciones de Componentes
*   **Separación de Preocupaciones:** Smart Components (Page/Container) manejan la lógica y fetch; Dumb Components (UI) solo reciben props y emiten eventos (`onAction`).
*   **Nomenclatura:** PascalCase para componentes (`ProductCard.tsx`), camelCase para hooks (`useAuth.ts`), kebab-case para utilidades si se prefiere.
*   **Tipado:** TypeScript estricto. Todas las props deben estar tipadas mediante `interface`.
*   **Estilos:** Uso de TailwindCSS validado con `clsx` y `tailwind-merge` para componer clases condicionales limpiamente (ej. librerías como *shadcn/ui*).

---

## 4. Catálogo de Componentes Reutilizables

### Layout & Navigación
*   **Sidebar Navigation:** Links semánticos con íconos, estado activado (`isActive`), sección colapsable.
*   **Topbar:** Búsqueda global, Breadcrumbs, Selector de "Tienda" (si tiene varias), Avatar de usuario.

### Core UI (Atomic)
*   **Button:** Variantes (`primary`, `secondary`, `outline`, `ghost`, `danger`). Tamaños (`sm`, `md`, `lg`). Soporte de estado `loading` con spinner integrado.
*   **Input & Textarea:** Estilos con estados definidos (focus-ring, invalid con borde rojo y subtexto de error).
*   **Select / Combobox:** Buscable si las opciones > 10.
*   **Checkbox / Radio / Switch (Toggle):** Esenciales para configuración móvil y rápida.

### Data Display (SaaS)
*   **Data Table:** Paginación (server-side para > 50 ítems), ordenamiento por columnas, checkbox para acciones masivas (Bulk Actions), skeleton loading temporal, empty state si no hay datos.
*   **Dashboard Cards (MetricCards):** Título, Valor grande, y variación porcentual (+5.2% en verde, -1.2% en rojo).
*   **Badge/Status Pill:** Indicadores visuales de estado (Ej. *Pendiente* en amarillo, *Enviado* en verde).

### Feedback & Overlays
*   **Modals (Dialogs):** Para confirmar acciones críticas (Ej. "Eliminar producto"). Overlay oscuro oscuro con blur. Foco atrapado en el modal.
*   **Drawers (Slide-overs):** Panel lateral para flujos secundarios complejos (Ej. Editar una variante de producto o el Carrito del storefront).
*   **Toasts (Notificaciones):** En la esquina inferior derecha o superior centro. Para feedback de éxito/error. Desaparecen en 3-5s.

### Estados Consistentes
*   **Skeleton Loading:** En lugar de spinners genéricos, usar cajas gris claro pulsantes que imiten la estructura del contenido final para reducir la percepción de tiempo de carga.
*   **Empty States:** Diseños amigables cuando una lista (ej. Pedidos) está vacía. *Nunca dejar un espacio en blanco*. Siempre incluir un ícono ilustrativo, un título, texto descriptivo y un Call to Action (CTA) primordial (Ej. "No tienes pedidos aún -> Visita la academia para aprender a vender").
*   **Error Boundaries/States:** Si falla el fetch, mostrar botón táctico de "Reintentar" o mensaje de error claro sin romper el layout (Fallback UI).

---

## 5. Wireframes Descriptivos (Modelos Mentales)

### Admin: Vista de "Pedidos" (Data Table)
```text
[ Sidebar ] | [ Topbar: Titulo "Pedidos" | Buscador | Exportar CSV ]
[ Nav     ] |-------------------------------------------------------
[         ] | [ Filtros: Estado v ] [ Fecha v ]
[         ] | 
[         ] | [ ] ID     | Cliente   | Total   | Estado      | Creado
[         ] | [x] #1023  | M. Gomez  | $120.00 | [Pendiente] | Hoy 10:00
[         ] | [ ] #1022  | L. Perez  |  $45.00 | [Enviado]   | Ayer
[         ] | 
[         ] | <-- Paginación (1 2 3 ... 9) -->
```

### Storefront: Drawer de "Carrito"
```text
[ Overlay Oscuro ] | [X] Tu Carrito (2 items)
                   | -------------------------
                   | [Img] Producto A  $50.00
                   |       Talla: M | Qty: [- 1 +]
                   | [Img] Producto B  $20.00
                   |       Color: Rojo | Qty: [- 1 +]
                   | -------------------------
                   | Subtotal:         $70.00
                   | Envio estimado:   $5.00
                   | 
                   | [ CTA: Continuar al Checkout (Grande y oscuro) ]
```

---

## 6. MVP Scope & Errores a Evitar

### Foco del MVP (Producto Mínimo Viable)
1.  **SaaS:** Importación de 1 proveedor catálogo único a la tienda propia, personalización básica de precios, y visión de pedidos entrantes.
2.  **Storefront:** Plantilla única altamente optimizada para móvil (Mobile-first). Mínima configuración de colores/logo. Carrito funcional.
3.  **Checkout:** Integración directa con 1 solo método de pago confiable (Stripe o MP), priorizando seguridad y fluidez.

### Errores UX/UI a Evitar CRÍTICAMENTE
*   ❌ **Sobrecarga de opciones de diseño en el Storefront:** Dar demasiada libertad al usuario rompe su tienda. Ofrecer 2-3 temas premium y solo cambiar logo/color de acento.
*   ❌ **Formularios largos en 1 sola página:** Dividir configuraciones complejas en Tabs (Pestañas) o wizards (paso a paso).
*   ❌ **Falta de Feedback:** Si el usuario presiona "Guardar Producto", el botón debe indicar *loading* y luegos mostrar un *toast* de éxito.
*   ❌ **No pensar en Responsive:** El SaaS admin a menudo se ignora en móvil por ser complejo. Las tablas deben transformarse en tarjetas en pantallas pequeñas o habilitar scroll horizontal suave. El Storefront debe ser 100% Mobile-First.

---

## PLAN DE EJECUCIÓN MVP (Foco Argentina)

Este plan de ejecución define el alcance exacto y las decisiones técnicas para salir a la calle rápido, validando el producto con usuarios argentinos sin complejidades innecesarias.

### 1. PRD DEL MVP (Product Requirements Document)
*   **Objetivo del producto:** Permitir a emprendedores argentinos crear un ecommerce propio en minutos para vender productos de un catálogo de dropshipping sin manejar stock físico y cobrando sus ventas directo a su billetera.
*   **Usuario ideal:** Emprendedores no técnicos, influencers o revendedores en Argentina que buscan un ingreso extra pero no tienen capital para stock ni conocimientos para armar una tienda online propia.
*   **Problema que resuelve:** La barrera técnica y financiera de montar una tienda, lidiar con integraciones de envíos, y la necesidad de conseguir proveedores confiables.
*   **Propuesta de valor:** "Armá tu tienda en 2 clics. Elegí qué vender, nuestro catálogo se encarga del envío."
*   **Alcance exacto del MVP:**
    *   *SaaS Admin:* Registro básico, conector a Mercado Pago (credenciales), catálogo pre-cargado de un único proveedor master, y visor de ventas.
    *   *Storefront:* Tienda pública bajo un subdominio autogenerado (`nombre.plataforma.com.ar`), carrito sencillo, checkout optimizado integrado.
*   **Qué queda afuera (para futuras iteraciones):** Dominios personalizados (`.com` directo), panel de afiliados, multi-moneda u operaciones internacionales, envío Flex o Múltiples proveedores (se empieza con centralizado), integraciones API con AFIP, Themes avanzados para el Storefront (solo existirá 1 layout altamente optimizado).

### 2. FLUJOS OPERATIVOS CRÍTICOS

*   **1. Importación y Edición de Productos:**
    1.  Dropshipper visita "Catálogo General".
    2.  Hace clic en "Agregar a mi tienda" sobre un producto. (El producto se clona virtualmente referenciado a su `tenant_id`).
    3.  Abre el producto en "Mis Productos". Visualiza el *Costo Base*.
    4.  Asigna un *Precio de Venta* final (definiendo su ganancia) y lo marca como "Publicado".
*   **2. Compra y Checkout (Storefront):**
    1.  Cliente final visita el Storefront, añade el producto al Carrito (Drawer).
    2.  Avanza a la pantalla Checkout (única, limpia). Ingresa sus datos (Email, DNI, Provincia, Localidad, Calle, CP).
    3.  Se genera una `Orden` en base de datos con estado "Pendiente de Pago".
    4.  Se renderiza Mercado Pago (vía Checkout Bricks o redirección a Checkout Pro).
*   **3. Pago y Split Financiero:**
    1.  Cliente paga con Mercado Pago. Webhook notifica del pago correcto (`approved`) a nuestro backend.
    2.  La Orden en la tienda pasa a "Pagada" y la plata ingresa directo a la cuenta MP del Dropshipper.
    3.  *Action MVP:* El backend notifica de inmediato al Proveedor Master que debe preparar la Orden X. El dropshipper deberá recargar un saldo en el sistema o pagar el costo de la prenda manual al proveedor en V1 para liberar la etiqueta, manteniendo simple el flujo legal/contable inicial. (Alternativa si hay MercadoPago OAuth: Split Payment en origen, pero el MVP ideal pide que el usuario pague al master por fuera para evitar la extrema burocracia técnica V1).
*   **4. Despacho y Seguimiento:**
    1.  Proveedor Master despacha (Correo Argentino / Andreani u OCA).
    2.  Actualiza código de seguimiento en su panel master. Esto se refleja en el SaaS del Dropshipper ("Enviado").
    3.  Cliente final recibe un mail automático nuestro "Tu pedido fue enviado" con el link de Correo Argentino.

### 3. ARQUITECTURA MULTI-TENANT MVP

*   **Resolución de Tiendas (Tenant Isolation):**
    *   Utilizamos la capacidad de `Middleware` de Next.js (App Router).
    *   Un comodín DNS en Cloudflare/Vercel apunta `*.plataforma.com.ar` a la misma aplicación.
    *   El middleware de Next lee la URL: Si es `app.plataforma.com.ar` rutea internamente al grupo `/(admin)`.
    *   Si es `pepito.plataforma.com.ar`, extrae el subdominio `pepito`, hace match en la BD para obtener el `tenant_id`, y rutea al grupo `/[store]` inyectando el ID internamente.
*   **Auth de Usuario:**
    *   Dropshipper (Admin): Autenticación simple (Magic Link o Correo/Pass) usando Supabase Auth / Auth.js. El token o sesión está atado su `tenant_id`.
    *   Cliente Final (Storefront): Sin autenticación obligatoria. Experiencia "Guest Checkout" para no perder tasa de conversión. Reconocemos clientes repetitivos por su correo al comprar.
*   **Seguridad de Operaciones:** RLS (Row Level Security) en base de datos (Ej: Supabase o Prisma filters). Cualquier consulta siempre debe incluir estáticamente `where: { tenant_id: user.tenant_id }`.

### 4. LISTA FINAL DE PANTALLAS MVP (Lista para diseño UI)

Esta es la enumeración exacta de pantallas a diseñar. Priorizadas por obligatoriedad en el camino crítico del primer dólar ganado.

**Prioridad 1: Flujo de Plata e Inventario**
1.  **SaaS Admin: Integración de Caja (Onboarding / Config)**
    *   *Objetivo:* Que conecten Mercado Pago inmediatamente.
    *   *Componentes:* Modal o vista única, input de Credenciales Producción MP (Public Key, Access Token) o botón OAuth.
    *   *Datos:* Estado Válido/Inválido de credenciales.
2.  **SaaS Admin: Catálogo de Sistema**
    *   *Objetivo:* Descubrir qué vender.
    *   *Componentes:* Listado simple en grilla, tarjetas de producto base (Imagen, Título corto, Precio Mayorista). Botón primario: "Vender este producto".
3.  **SaaS Admin: Edición de Producto Drop ("Mis Productos")**
    *   *Objetivo:* Asignar remarcación y visibilidad.
    *   *Componentes:* Fila en tabla. Al click, se abre *Drawer deslizable*. Inputs: Precio de Venta (ARS). Switch: Publicado/No Publicado. Texto: Margen de Ganancia calculado `($PrecioVenta - $PrecioMayorista)`.
4.  **SaaS Admin: Dashboard y Pedidos**
    *   *Objetivo:* Seguimiento del dropshipper.
    *   *Componentes:* Data Table (ID Orden, Fecha, Cliente final, Estado, Total ARS).
    *   *Acciones:* Ver Detalle (para confirmar si ya fue despachado).

**Prioridad 2: Venta Final (Storefront)**
5.  **Storefront: Store Product (PDP)**
    *   *Objetivo:* Informar y llevar al carrito rápido.
    *   *Componentes:* Imagen hero del producto ocupando 50% de mobile. Título grande, Precio explícito, Cuotas Mercado Pago (si aplica). Acordeón descripción. Botón fijo inferior "Añadir y Comprar" que abre el Drawer de carrito.
6.  **Storefront: Cart y Checkout Fluid (Una sola pantalla visual)**
    *   *Objetivo:* Conversión impecable en LatAm móvil.
    *   *Componentes:* Slide-drawer para resumir compra. Al dar avanzar, página de Checkout dividida en 3 bloques lógicos, un solo scroll (1. Tu Datos, 2. Envío a Casa/Sucursal -con CP local-, 3. Pagá seguro). Formulario limpio, grande, sin barreras.
7.  **Storefront: Store Home**
    *   *Objetivo:* Si visitan el dominio raíz, qué ven.
    *   *Componentes:* Header minúsculo, Banners promocionales, Listado de todos los productos "Publicados".

**Prioridad 3: Autenticación inicial**
8.  **SaaS Admin: Página de Registro y Login (Marketing/App)**
    *   *Objetivo:* Onboarding del vendedor.
    *   *Componentes:* Iniciar con Google o Auth Simple. Pantalla de 1 paso posterior: "Elegí el nombre de tu tienda" (Valida disponibilidad de subdominio).
