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
}
