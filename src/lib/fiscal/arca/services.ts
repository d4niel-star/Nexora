import { prisma } from "@/lib/db/prisma";
import type { Order } from "@prisma/client";
import { logSystemEvent } from "@/lib/observability/audit";

/**
 * Validates if the store is legally set up to emit fiscal documents
 */
export async function validateFiscalProfile(storeId: string) {
  const profile = await prisma.fiscalProfile.findUnique({ where: { storeId } });
  if (!profile || profile.status !== "active") {
    throw new Error("Fiscal profile is incomplete or inactive for this store.");
  }
  return profile;
}

/**
 * Maps an internal Nexora Order into a generic Fiscal payload,
 * then translates it to ARCA format.
 */
export async function issueInvoiceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true, items: true, fiscalInvoice: true }
  });

  if (!order) throw new Error("Order not found");
  if (order.fiscalInvoice && order.fiscalInvoice.fiscalStatus === "authorized") {
    throw new Error("Order already has an authorized fiscal invoice.");
  }

  const profile = await validateFiscalProfile(order.storeId);

  // 1. Determine invoice type based on IVA condition
  // (Simplified mapping: "C" for monotributo, "B" for final consumer if RI)
  let invoiceType = "Factura C";
  if (profile.ivaCondition === "responsable_inscripto") invoiceType = "Factura B";
  
  // Create mapping payload for internal reference
  const subtotal = order.subtotal;
  const taxAmount = invoiceType === "Factura B" ? subtotal * 0.21 : 0; // Very simplified mock VAT logic
  const total = subtotal + order.shippingAmount + taxAmount;

  // 2. Persist the Draft Invoice to track attempts
  let invoice = await prisma.fiscalInvoice.upsert({
    where: { orderId: order.id },
    create: {
      storeId: order.storeId,
      orderId: order.id,
      customerName: `${order.firstName} ${order.lastName}`,
      customerTaxId: order.document || "99999999", // Generic consumer if absent
      invoiceType,
      pointOfSale: profile.pointOfSale,
      subtotal,
      taxAmount,
      total,
      currency: "ARS",
      fiscalStatus: "pending"
    },
    update: {
      fiscalStatus: "pending", // Resetting attempt
    }
  });

  // 3. Connect to AFIP/ARCA (Mock implementation in ARCA mode "testing")
  try {
     const afipResponse = await mockArcaWebServiceCall(invoice, profile);
     
     // 4. Handle Response
     if (afipResponse.status === "A") {
        invoice = await prisma.fiscalInvoice.update({
           where: { id: invoice.id },
           data: {
              arcaCae: afipResponse.cae,
              caeExpiresAt: new Date(afipResponse.caeFchVto),
              invoiceNumber: Math.floor(Math.random() * 100000) + 1, // Simulated sequence
              fiscalStatus: "authorized",
              issuedAt: new Date(),
              rawResponseJson: JSON.stringify(afipResponse.rawResponse)
           }
        });
        
        await logSystemEvent({
          storeId: order.storeId,
          eventType: "fiscal_invoice_authorized",
          entityType: "FiscalInvoice",
          source: "arca_service",
          message: `ArCA Factura aprobada para orden ${order.orderNumber}`
        });
     } else {
        invoice = await prisma.fiscalInvoice.update({
           where: { id: invoice.id },
           data: {
              fiscalStatus: "rejected",
              rawResponseJson: JSON.stringify(afipResponse.rawResponse)
           }
        });
        await logSystemEvent({
          storeId: order.storeId,
          eventType: "fiscal_invoice_failed",
          entityType: "FiscalInvoice",
          source: "arca_service",
          severity: "error",
          message: `ArCA Rechazo comprobante orden ${order.orderNumber}: ${afipResponse.observations?.join(", ")}`
        });
     }

  } catch (error: any) {
     await prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
           fiscalStatus: "error",
           rawResponseJson: JSON.stringify({ error: error.message })
        }
     });
     throw error;
  }

  return invoice;
}

/**
 * Mock WS API Call wrapping AFIP SDK/Integrator
 */
async function mockArcaWebServiceCall(invoice: any, profile: any) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (profile.arcaMode === "production" && !profile.certificateJson) {
     throw new Error("Missing fiscal certificate for production mode. Valid certificates are required by ARCA (AFIP).");
  }

  // Simulate success in 95% of cases
  if (Math.random() > 0.05) {
     return {
        status: "A" as const,
        cae: "6" + Math.floor(1000000000000 + Math.random() * 900000000000).toString(),
        caeFchVto: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        rawResponse: { resultado: "Aprobado", cbte_nro: 1042 }
     };
  } else {
     return {
        status: "R" as const,
        observations: ["10015 - DocNro inválido para consumidor final mayor a tope."],
        rawResponse: { resultado: "Rechazado", obs: "Documento inválido" }
     }
  }
}

/**
 * Issues a credit note for a given authorized invoice.
 */
export async function issueCreditNoteForInvoice(invoiceId: string, reason: string = "Devolución / Cancelación") {
   const originalInvoice = await prisma.fiscalInvoice.findUnique({
      where: { id: invoiceId },
      include: { order: true }
   });

   if (!originalInvoice || originalInvoice.fiscalStatus !== "authorized") {
      throw new Error("Cannot issue credit note: Original invoice is not authorized.");
   }

   const profile = await validateFiscalProfile(originalInvoice.storeId);

   // Determine credit note type based on original type
   let cnType = "Nota de Crédito C";
   if (originalInvoice.invoiceType.includes("B")) cnType = "Nota de Crédito B";
   if (originalInvoice.invoiceType.includes("A")) cnType = "Nota de Crédito A";

   let creditNote = await prisma.fiscalInvoice.create({
      data: {
         storeId: originalInvoice.storeId,
         parentInvoiceId: originalInvoice.id,
         orderId: undefined, // Explicitly decoupled, or could link to same order but Prisma unique constraints might fail if we map both to orderId
         customerName: originalInvoice.customerName,
         customerTaxId: originalInvoice.customerTaxId,
         invoiceType: cnType,
         pointOfSale: profile.pointOfSale,
         subtotal: -originalInvoice.subtotal,
         taxAmount: -originalInvoice.taxAmount,
         total: -originalInvoice.total,
         currency: originalInvoice.currency,
         fiscalStatus: "pending"
      }
   });

   try {
      const afipResponse = await mockArcaWebServiceCall(creditNote, profile);
      
      if (afipResponse.status === "A") {
         creditNote = await prisma.fiscalInvoice.update({
            where: { id: creditNote.id },
            data: {
               arcaCae: afipResponse.cae,
               caeExpiresAt: new Date(afipResponse.caeFchVto),
               invoiceNumber: Math.floor(Math.random() * 10000) + 1,
               fiscalStatus: "authorized",
               issuedAt: new Date(),
               rawResponseJson: JSON.stringify(afipResponse.rawResponse)
            }
         });
         
         await logSystemEvent({
            storeId: originalInvoice.storeId,
            eventType: "credit_note_issued",
            entityType: "FiscalInvoice",
            entityId: creditNote.id,
            source: "arca_service",
            message: `ArCA Nota de Crédito autorizada para fra originial ${originalInvoice.pointOfSale}-${originalInvoice.invoiceNumber}`
         });

         // Update original invoice status if needed
         await prisma.fiscalInvoice.update({
            where: { id: originalInvoice.id },
            data: { fiscalStatus: "credited" }
         });

      } else {
         creditNote = await prisma.fiscalInvoice.update({
            where: { id: creditNote.id },
            data: {
               fiscalStatus: "rejected",
               rawResponseJson: JSON.stringify(afipResponse.rawResponse)
            }
         });
         await logSystemEvent({
            storeId: originalInvoice.storeId,
            eventType: "credit_note_failed",
            entityType: "FiscalInvoice",
            entityId: creditNote.id,
            source: "arca_service",
            severity: "error",
            message: `ArCA Rechazo nota de crédito: ${afipResponse.observations?.join(", ")}`
         });
      }
   } catch (error: any) {
      await prisma.fiscalInvoice.update({
         where: { id: creditNote.id },
         data: {
            fiscalStatus: "error",
            rawResponseJson: JSON.stringify({ error: error.message })
         }
      });
      throw error;
   }

   return creditNote;
}
