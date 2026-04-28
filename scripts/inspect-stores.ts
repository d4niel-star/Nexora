// Quick inspection: list stores with their slugs/active flags so the
// pickup E2E knows which storefront URL to hit.
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const stores = await prisma.store.findMany({
    select: { id: true, slug: true, name: true, active: true },
  });
  console.log("stores:", JSON.stringify(stores, null, 2));

  const locations = await prisma.storeLocation.findMany({
    select: { id: true, storeId: true, name: true, pickupEnabled: true },
  });
  console.log("locations:", JSON.stringify(locations, null, 2));

  const methods = await prisma.shippingMethod.findMany({
    where: { type: "pickup" },
    select: {
      id: true,
      storeId: true,
      code: true,
      name: true,
      isActive: true,
      baseAmount: true,
    },
  });
  console.log("pickup methods:", JSON.stringify(methods, null, 2));
}

main().finally(() => process.exit(0));
