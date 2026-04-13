import { prisma } from "@/lib/db/prisma";

export interface ShippingMethodData {
  id: string;
  code: string;
  name: string;
  type: string;
  carrier: string | null;
  baseAmount: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  freeShippingOver: number | null;
  isDefault: boolean;
}

export async function getShippingMethods(storeId: string): Promise<ShippingMethodData[]> {
  const methods = await prisma.shippingMethod.findMany({
    where: { storeId, isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  return methods.map(m => ({
    id: m.id,
    code: m.code,
    name: m.name,
    type: m.type,
    carrier: m.carrier,
    baseAmount: m.baseAmount,
    estimatedDaysMin: m.estimatedDaysMin,
    estimatedDaysMax: m.estimatedDaysMax,
    freeShippingOver: m.freeShippingOver,
    isDefault: m.isDefault,
  }));
}

export function calculateShippingAmount(method: ShippingMethodData, subtotal: number): number {
  if (method.freeShippingOver && subtotal >= method.freeShippingOver) {
    return 0;
  }
  return method.baseAmount;
}

export function formatShippingEstimate(method: ShippingMethodData): string {
  if (method.type === 'pickup') {
    return "Retiro inmediato";
  }
  
  if (method.estimatedDaysMin && method.estimatedDaysMax) {
    if (method.estimatedDaysMin === method.estimatedDaysMax) {
      return `Llega en ${method.estimatedDaysMin} días`;
    }
    return `Llega entre ${method.estimatedDaysMin} y ${method.estimatedDaysMax} días`;
  }
  
  if (method.estimatedDaysMin) {
    return `Llega en ${method.estimatedDaysMin} días`;
  }
  
  return "Calculado en checkout";
}
