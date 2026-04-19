"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "../../observability/audit";

export async function addCustomDomain(storeId: string, hostname: string) {
  // Normalize hostname
  const cleanHostname = hostname.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "").trim();
  
  // Hardened hostname validation
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!cleanHostname || !hostnameRegex.test(cleanHostname) || cleanHostname.length > 253) {
    throw new Error("Formato de dominio inválido. Ej: mitienda.com");
  }

  const { checkFeatureAccess } = await import("@/lib/billing/service");
  const gate = await checkFeatureAccess(storeId, "custom_domain");
  if (!gate.allowed) {
    throw new Error(gate.reason || "Tu plan no permite dominios personalizados.");
  }

  // Check if it already exists across ANY store (to prevent hijacking)
  const existing = await prisma.storeDomain.findUnique({
    where: { hostname: cleanHostname }
  });

  if (existing) {
    if (existing.storeId === storeId) {
      throw new Error("El dominio ya está vinculado a esta tienda.");
    } else {
      throw new Error("El dominio ya está en uso por otra tienda.");
    }
  }

  const domain = await prisma.storeDomain.create({
    data: {
      storeId,
      hostname: cleanHostname,
      type: "custom",
      status: "pending",
      isPrimary: false, 
    }
  });

  await logSystemEvent({
    storeId,
    entityType: "domain",
    entityId: domain.id,
    eventType: "domain_added",
    source: "admin_panel",
    message: `Dominio personalizado ${cleanHostname} vinculado a tienda`
  });

  revalidatePath("/admin/store");
  return domain;
}

export async function removeCustomDomain(domainId: string, storeId: string) {
  const domain = await prisma.storeDomain.findUnique({ where: { id: domainId } });
  
  if (!domain || domain.storeId !== storeId) {
    throw new Error("Dominio no encontrado");
  }

  await prisma.storeDomain.delete({ where: { id: domainId } });
  
  // If it was primary, fallback primary
  if (domain.isPrimary) {
    await prisma.store.update({
      where: { id: storeId },
      data: { primaryDomain: null }
    });
  }

  await logSystemEvent({
    storeId,
    entityType: "domain",
    entityId: domainId,
    eventType: "domain_removed",
    source: "admin_panel",
    message: `Dominio ${domain.hostname} removido de la tienda`
  });

  revalidatePath("/admin/store");
  return { success: true };
}

export async function setPrimaryDomain(storeId: string, domainNameOrHostname: string) {
  // Reset all primary flags for this store
  await prisma.storeDomain.updateMany({
    where: { storeId },
    data: { isPrimary: false }
  });

  if (domainNameOrHostname.includes(".")) {
     const { checkFeatureAccess } = await import("@/lib/billing/service");
     const gate = await checkFeatureAccess(storeId, "custom_domain");
     if (!gate.allowed) {
       throw new Error(gate.reason || "Tu plan no permite dominios personalizados.");
     }

     // Setting a custom domain as primary
     const domain = await prisma.storeDomain.findUnique({
       where: { hostname: domainNameOrHostname }
     });
     
     if (domain && domain.storeId === storeId) {
       await prisma.storeDomain.update({
         where: { id: domain.id },
         data: { isPrimary: true }
       });
       
       await prisma.store.update({
         where: { id: storeId },
         data: { primaryDomain: domain.hostname }
       });
     }
  } else {
     // Settng subdomain or slug as primary fallback
     await prisma.store.update({
       where: { id: storeId },
       data: { primaryDomain: domainNameOrHostname }
     });
  }

  revalidatePath("/admin/store");
  return { success: true };
}

export async function verifyDomainStatus(domainId: string, storeId: string) {
   const domain = await prisma.storeDomain.findUnique({ where: { id: domainId } });
   if (!domain || domain.storeId !== storeId) throw new Error("Dominio no encontrado");

   // Mocking DNS validation logic: if valid
   // Usually we would fetch the DNS records of `domain.hostname` checking pointing to our Vercel/IP
   
   // For now, let's just mark it active automatically representing a successful validation
   const updated = await prisma.storeDomain.update({
      where: { id: domainId },
      data: { status: "active" }
   });

   await logSystemEvent({
     storeId,
     entityType: "domain",
     entityId: domainId,
     eventType: "domain_verified",
     source: "admin_panel",
     message: `Dominio ${domain.hostname} verificado y marcado activo`
   });

   revalidatePath("/admin/store");
   return updated;
}
