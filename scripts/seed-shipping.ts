import { prisma } from "../src/lib/db/prisma";

async function main() {
  console.log("Seeding shipping methods...");

  const store = await prisma.store.findFirst();
  if (!store) {
    console.log("No store found to seed shipping methods.");
    return;
  }

  const methods = [
    {
      storeId: store.id,
      code: "standard",
      name: "Estándar a Domicilio",
      type: "shipping",
      carrier: "OCA",
      baseAmount: 3500.0,
      estimatedDaysMin: 3,
      estimatedDaysMax: 5,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
      freeShippingOver: 40000.0,
    },
    {
      storeId: store.id,
      code: "express",
      name: "Envío Express",
      type: "shipping",
      carrier: "Andreani",
      baseAmount: 6500.0,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    {
      storeId: store.id,
      code: "pickup",
      name: "Retiro en Tienda",
      type: "pickup",
      carrier: null,
      baseAmount: 0.0,
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
    }
  ];

  for (const method of methods) {
    await prisma.shippingMethod.upsert({
      where: { storeId_code: { storeId: store.id, code: method.code } },
      update: method,
      create: method,
    });
  }

  console.log("Shipping methods seeded.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
