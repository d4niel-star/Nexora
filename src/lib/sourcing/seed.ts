import { prisma } from "@/lib/db/prisma";
import { type SourcingProvider } from "@prisma/client";

export async function seedProviders() {
  const count = await prisma.sourcingProvider.count();
  if (count > 0) return;

  await prisma.sourcingProvider.createMany({
    data: [
      {
        code: "global_dropship",
        name: "Global Dropship Pro",
        description: "El mayor proveedor B2B de tecnología y hogar con despacho en 24hs. Integración API en tiempo real.",
        integrationType: "api",
        supportedChannels: "mercadolibre,shopify",
        categories: "Electrónica, Hogar, Gadgets",
        logoUrl: "https://icons.yagro.com/mock_provider_1.png", // placeholder
        status: "active",
      },
      {
        code: "latam_trends",
        name: "Latam Trends",
        description: "Especialistas en moda y accesorios. Stock automático vía feed CSV diario.",
        integrationType: "csv",
        supportedChannels: "mercadolibre,shopify",
        categories: "Moda, Accesorios",
        logoUrl: "https://icons.yagro.com/mock_provider_2.png", // placeholder
        status: "active",
      },
      {
        code: "home_essentials",
        name: "Home Essentials",
        description: "Decoración y muebles de diseño. Envíos directos al cliente final.",
        integrationType: "api",
        supportedChannels: "shopify",
        categories: "Muebles, Decoración",
        logoUrl: "https://icons.yagro.com/mock_provider_3.png", // placeholder
        status: "active",
      }
    ]
  });

  const globalProvider = await prisma.sourcingProvider.findUnique({ where: { code: "global_dropship" } });
  if (globalProvider) {
    const prodCount = await prisma.providerProduct.count({ where: { providerId: globalProvider.id } });
    if (prodCount === 0) {
      await prisma.providerProduct.createMany({
        data: [
          {
            providerId: globalProvider.id,
            externalId: "ext-1001",
            title: "Auriculares Inalámbricos Premium Z9",
            description: "Auriculares con cancelación de ruido activa 40dB y 30hs de batería.",
            cost: 12000,
            suggestedPrice: 25000,
            stock: 45,
            category: "Electrónica",
            leadTime: "2-4 días",
            leadTimeMinDays: 2,
            leadTimeMaxDays: 4,
            imagesJson: JSON.stringify(["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800"])
          },
          {
            providerId: globalProvider.id,
            externalId: "ext-1002",
            title: "Reloj Inteligente Fit Tracker",
            description: "Monitoreo cardíaco, pasos, calorías y notificaciones.",
            cost: 8500,
            suggestedPrice: 19999,
            stock: 120,
            category: "Electrónica",
            leadTime: "1-3 días",
            leadTimeMinDays: 1,
            leadTimeMaxDays: 3,
            imagesJson: JSON.stringify(["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800"])
          },
          {
            providerId: globalProvider.id,
            externalId: "ext-1003",
            title: "Lámpara de Escritorio LED Minimalista",
            description: "Lámpara regulable, cuerpo de aluminio, diseño nórdico.",
            cost: 6000,
            suggestedPrice: 15499,
            stock: 30,
            category: "Hogar",
            leadTime: "3-7 días",
            leadTimeMinDays: 3,
            leadTimeMaxDays: 7,
            imagesJson: JSON.stringify(["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800"])
          }
        ]
      });
    }
  }
}
