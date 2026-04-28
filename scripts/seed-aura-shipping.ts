// Adds a default shipping method to aura-essentials so the pickup
// E2E can verify the radio toggle switches address fields back on.
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: "aura-essentials" } });
  if (!store) throw new Error("aura-essentials store not found");
  await prisma.shippingMethod.upsert({
    where: { storeId_code: { storeId: store.id, code: "standard" } },
    create: {
      storeId: store.id,
      code: "standard",
      name: "Envío estándar",
      type: "shipping",
      carrier: "OCA",
      baseAmount: 3500,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    update: { isActive: true, isDefault: true },
  });
  console.log("shipping method ready for aura-essentials");
}

main().finally(() => process.exit(0));
