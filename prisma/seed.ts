import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Nexora store engine...");

  // Clean up order/checkout/cart first (FK dependencies)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkoutDraft.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();

  await prisma.storePublishSnapshot.deleteMany();
  await prisma.storeBlock.deleteMany();
  await prisma.storePage.deleteMany();
  await prisma.storeNavigation.deleteMany();
  await prisma.storeTheme.deleteMany();
  await prisma.storeBranding.deleteMany();
  
  await prisma.collectionProduct.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  
  await prisma.store.deleteMany();

  // ─── Create Store ───
  const store = await prisma.store.create({
    data: {
      slug: "aura-essentials",
      name: "Aura Essentials",
      status: "active",
      subdomain: "aura-essentials.nexora.app",
      primaryDomain: "www.auraessentials.com.ar",
      locale: "es-AR",
      currency: "ARS",
    },
  });

  console.log(`  ✓ Store created: ${store.name} (${store.slug})`);

  // ─── Branding ───
  await prisma.storeBranding.create({
    data: {
      storeId: store.id,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: "#0F172A",
      secondaryColor: "#E2E8F0",
      fontFamily: "Inter",
      tone: "elegant",
      buttonStyle: "rounded-sm",
    },
  });

  console.log("  ✓ Branding created");

  // ─── Theme ───
  await prisma.storeTheme.create({
    data: {
      storeId: store.id,
      activeTheme: "minimal",
      themeVariant: "light",
      themeStatus: "published",
      isPublished: true,
    },
  });

  console.log("  ✓ Theme created");

  // ─── Navigation ───
  const navItems = [
    { group: "header", label: "Shop All", href: "/aura-essentials/collections", sortOrder: 0 },
    { group: "header", label: "Best Sellers", href: "/aura-essentials/collections/best-sellers", sortOrder: 1 },
    { group: "header", label: "Rostro", href: "/aura-essentials/collections/rostro", sortOrder: 2 },
    { group: "header", label: "Nosotros", href: "/aura-essentials/about", sortOrder: 3 },
    { group: "header", label: "Tracking", href: "/aura-essentials/tracking", sortOrder: 4 },
    { group: "footer_shop", label: "Ver todo", href: "/aura-essentials/collections", sortOrder: 0 },
    { group: "footer_shop", label: "Cuerpo", href: "/aura-essentials/collections/cuerpo", sortOrder: 1 },
    { group: "footer_shop", label: "Sets", href: "/aura-essentials/collections/sets", sortOrder: 2 },
    { group: "footer_support", label: "Contacto", href: "/aura-essentials/contact", sortOrder: 0 },
    { group: "footer_support", label: "FAQ", href: "/aura-essentials/faq", sortOrder: 1 },
    { group: "footer_support", label: "Política de Devoluciones", href: "/aura-essentials/policies/returns", sortOrder: 2 },
  ];

  await prisma.storeNavigation.createMany({
    data: navItems.map((n) => ({
      storeId: store.id,
      ...n,
      isVisible: true,
    })),
  });

  console.log(`  ✓ Navigation created (${navItems.length} items)`);

  // ─── Pages ───
  const pages = [
    { type: "system", title: "Inicio", slug: "/", status: "published" },
    { type: "system", title: "Contacto", slug: "/contacto", status: "published" },
    { type: "system", title: "Preguntas frecuentes", slug: "/faq", status: "published" },
    { type: "system", title: "Política de privacidad", slug: "/privacidad", status: "published" },
    { type: "system", title: "Devoluciones", slug: "/devoluciones", status: "published" },
    { type: "system", title: "Nosotros", slug: "/nosotros", status: "draft" },
    { type: "custom", title: "Guía de talles", slug: "/guia-talles", status: "published" },
  ];

  await prisma.storePage.createMany({
    data: pages.map((p) => ({ storeId: store.id, ...p })),
  });

  console.log(`  ✓ Pages created (${pages.length} pages)`);

  // ─── Home Blocks ───
  const homeBlocks = [
    {
      blockType: "hero",
      sortOrder: 0,
      settingsJson: JSON.stringify({
        headline: "La esencia de tu piel, revelada.",
        subheadline: "Fórmulas limpias, orgánicas y clínicamente comprobadas. Diseño y ciencia en armonía.",
        primaryActionLabel: "Comprar ahora",
        primaryActionLink: "/aura-essentials/collections",
        secondaryActionLabel: "Aprender más",
        backgroundImageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=2000",
      }),
      source: "ai",
    },
    {
      blockType: "benefits",
      sortOrder: 1,
      settingsJson: JSON.stringify({
        title: "Por qué elegir Aura",
        benefits: [
          { title: "Cruelty Free", description: "Certificado Leaping Bunny", icon: "Rabbit" },
          { title: "Ingredientes Limpios", description: "Sin sulfatos ni parabenos", icon: "Leaf" },
          { title: "Envíos Gratis", description: "En órdenes mayores a $50.000", icon: "Truck" },
        ],
      }),
      source: "ai",
    },
    {
      blockType: "featured_products",
      sortOrder: 2,
      settingsJson: JSON.stringify({
        title: "Nuestros Favoritos",
        subtitle: "Descubrí lo más buscado de la temporada.",
        productHandles: ["serum-revitalizante-noche", "limpiador-facial-suave", "crema-hidratante-dia", "mascarilla-detox-arcilla"],
      }),
      source: "ai",
    },
    {
      blockType: "featured_categories",
      sortOrder: 3,
      settingsJson: JSON.stringify({
        title: "Explorá por Categoría",
        collectionHandles: ["rostro", "best-sellers", "sets"],
      }),
      source: "ai",
    },
    {
      blockType: "testimonials",
      sortOrder: 4,
      settingsJson: JSON.stringify({
        title: "Lo que dicen nuestros clientes",
        testimonials: [
          { name: "María G.", text: "Increíble la textura del sérum. Mi piel cambió en una semana.", rating: 5 },
          { name: "Luciana P.", text: "El packaging es tan hermoso que lo uso de decoración. Y el producto es aún mejor.", rating: 5 },
          { name: "Sofía R.", text: "Atención al cliente impecable. Resolvieron mi consulta en minutos.", rating: 4 },
        ],
      }),
      source: "ai",
    },
    {
      blockType: "faq",
      sortOrder: 5,
      settingsJson: JSON.stringify({
        title: "Preguntas Frecuentes",
        questions: [
          { question: "¿Cuánto tarda el envío?", answer: "Los envíos dentro de CABA y GBA se entregan en 24-48hs hábiles. Al interior del país, entre 3-5 días hábiles." },
          { question: "¿Puedo devolver un producto?", answer: "Sí, tenés 30 días desde la recepción para iniciar una devolución sin costo." },
          { question: "¿Los productos son testeados en animales?", answer: "No. Todos nuestros productos son 100% cruelty-free y certificados por Leaping Bunny." },
          { question: "¿Qué métodos de pago aceptan?", answer: "Aceptamos tarjetas de crédito/débito, transferencia bancaria y Mercado Pago." },
        ],
      }),
      source: "ai",
    },
    {
      blockType: "newsletter",
      sortOrder: 6,
      settingsJson: JSON.stringify({
        title: "Únete al Inner Circle",
        description: "Recibí 10% OFF en tu primera compra y enteráte de lanzamientos antes que nadie.",
        buttonLabel: "Suscribirse",
      }),
      source: "ai",
    },
  ];

  await prisma.storeBlock.createMany({
    data: homeBlocks.map((b) => ({
      storeId: store.id,
      pageType: "home",
      isVisible: true,
      state: "published",
      ...b,
    })),
  });

  console.log(`  ✓ Home blocks created (${homeBlocks.length} blocks)`);

  // ─── Collections ───
  const collectionsData = [
    {
      handle: "rostro",
      title: "Cuidado Facial",
      description: "Todo lo que necesitas para tu rutina diaria de skincare.",
      imageUrl: "https://images.unsplash.com/photo-1615397323924-b1bce1087e5b?auto=format&fit=crop&q=80&w=800",
      sortOrder: 0,
    },
    {
      handle: "best-sellers",
      title: "Más Vendidos",
      description: "Los favoritos absolutos de nuestra comunidad.",
      imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
      sortOrder: 1,
    },
    {
      handle: "sets",
      title: "Kits de Regalo",
      description: "Conjuntos pensados para sorprender, con un ahorro especial.",
      imageUrl: "https://images.unsplash.com/photo-1555529959-8666ec4836ac?auto=format&fit=crop&q=80&w=800",
      sortOrder: 2,
    }
  ];

  for (const col of collectionsData) {
    await prisma.collection.create({
      data: {
        storeId: store.id,
        ...col,
        isPublished: true,
      }
    });
  }
  console.log(`  ✓ Collections created (${collectionsData.length} items)`);

  // ─── Products ───
  const productsData = [
    {
      handle: "serum-revitalizante-noche",
      title: "Serum Revitalizante de Noche",
      description: "Un serum concentrado que repara la barrera cutánea mientras duermes. Formulado con acido hialuronico y ceramidas.",
      price: 38900,
      compareAtPrice: 45000,
      featuredImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200",
      status: "published",
      isPublished: true,
      category: "rostro",
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1608248593802-84157120db0c?auto=format&fit=crop&q=80&w=1200"
      ],
      variants: [{ title: "30ml", price: 38900, stock: 50 }, { title: "50ml", price: 58000, stock: 30 }],
      collectionHandles: ["rostro", "best-sellers"]
    },
    {
      handle: "limpiador-facial-suave",
      title: "Limpiador Facial Suave con Matcha",
      description: "Gel limpiador diario que elimina impurezas sin resecar la piel. Con extractos calmantes de matcha y manzanilla.",
      price: 18500,
      featuredImage: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=1200",
      status: "published",
      isPublished: true,
      category: "rostro",
      images: [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=1200"
      ],
      variants: [{ title: "Default", price: 18500, stock: 100 }],
      collectionHandles: ["rostro"]
    },
    {
      handle: "crema-hidratante-dia",
      title: "Crema Hidratante de Día FPS 30",
      description: "Crema ligera con proteccion solar, ideal para uso diario debajo del maquillaje.",
      price: 32000,
      compareAtPrice: 35000,
      featuredImage: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=1200",
      status: "published",
      isPublished: true,
      category: "rostro",
      images: [
        "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=1200"
      ],
      variants: [{ title: "Default", price: 32000, stock: 65 }],
      collectionHandles: ["rostro", "best-sellers"]
    },
    {
      handle: "mascarilla-detox-arcilla",
      title: "Mascarilla Detox Arcilla Pura",
      description: "Limpieza profunda de poros, absorbe el exceso de sebo y revitaliza la piel opaca en 10 minutos.",
      price: 24500,
      featuredImage: "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=1200",
      status: "published",
      isPublished: true,
      category: "rostro",
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=1200"
      ],
      variants: [{ title: "Default", price: 24500, stock: 40 }],
      collectionHandles: ["rostro", "sets"]
    }
  ];

  const dbCollections = await prisma.collection.findMany({ where: { storeId: store.id } });

  for (const prod of productsData) {
    const createdProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        handle: prod.handle,
        title: prod.title,
        description: prod.description,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        featuredImage: prod.featuredImage,
        status: prod.status,
        isPublished: prod.isPublished,
        category: prod.category,
        isFeatured: prod.isFeatured,
      }
    });

    for (let i = 0; i < prod.images.length; i++) {
        await prisma.productImage.create({
            data: {
                productId: createdProduct.id,
                url: prod.images[i],
                sortOrder: i
            }
        });
    }

    for (const v of prod.variants) {
        await prisma.productVariant.create({
            data: {
                productId: createdProduct.id,
                title: v.title,
                price: v.price,
                stock: v.stock,
                isDefault: v.title === "Default" || prod.variants.length === 1
            }
        });
    }

    for (const handle of prod.collectionHandles) {
        const col = dbCollections.find(c => c.handle === handle);
        if (col) {
            await prisma.collectionProduct.create({
                data: {
                    collectionId: col.id,
                    productId: createdProduct.id
                }
            });
        }
    }
  }

  console.log(`  ✓ Products created (${productsData.length} items)`);

  // ─── Publish Snapshot ───
  const fullStore = await prisma.store.findUnique({
    where: { id: store.id },
    include: {
      branding: true,
      theme: true,
      navigations: true,
      pages: true,
      blocks: true,
    },
  });

  await prisma.storePublishSnapshot.create({
    data: {
      storeId: store.id,
      snapshotJson: JSON.stringify({
        ...fullStore,
        publishedAt: new Date().toISOString(),
      }),
    },
  });

  console.log("  ✓ Initial publish snapshot created");

  console.log("\n✅ Seed completed successfully!");
  console.log(`   Store URL: /aura-essentials`);
  console.log(`   Admin: /admin/store`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
