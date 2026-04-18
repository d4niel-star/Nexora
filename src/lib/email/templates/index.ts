import { OrderEmailData, StockCriticalEmailData, AbandonedCartEmailData } from "../types";

// Base Layout for all emails
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

const BaseTemplate = (title: string, storeName: string, content: string, ctaUrl?: string, ctaText?: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; color: #111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; background-color: #111111;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${storeName}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
              
              ${ctaUrl && ctaText ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111111; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #F3F4F6; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 13px;">
              <p style="margin: 0 0 10px 0;">Gracias por elegir <strong>${storeName}</strong>.</p>
              <p style="margin: 0;">¿Necesitás ayuda? Respondé este correo para contactarnos.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export function generateOrderCreatedTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">Recibimos tu pedido</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Gracias por tu compra. Estamos preparando tu pedido <strong>${data.orderNumber}</strong> y nos pondremos en contacto cuando sea enviado.
    </p>

    <!-- Order Summary Box -->
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 20px; margin-top: 30px;">
      <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280;">Resumen del Pedido</h3>
      
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 15px; color: #374151;">
        <tr>
          <td style="padding: 8px 0;">Subtotal</td>
          <td align="right" style="padding: 8px 0; font-weight: 500;">${formatCurrency(data.subtotal, data.currency)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Envío ${data.shippingMethodLabel ? `(${data.shippingMethodLabel})` : ''}</td>
          <td align="right" style="padding: 8px 0; font-weight: 500;">${data.shippingAmount > 0 ? formatCurrency(data.shippingAmount, data.currency) : 'Gratis'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 10px 0;"><div style="border-top: 1px solid #E5E7EB;"></div></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; font-size: 18px; color: #111111;">Total</td>
          <td align="right" style="padding: 8px 0; font-weight: 800; font-size: 18px; color: #111111;">${formatCurrency(data.total, data.currency)}</td>
        </tr>
      </table>
    </div>
  `;
  return BaseTemplate("Recibimos tu pedido", data.storeName, content, data.statusUrl, "Ver estado del pedido");
}

export function generatePaymentApprovedTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">¡Pago Aprobado!</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Queríamos contarte que el pago de tu pedido <strong>${data.orderNumber}</strong> se ha procesado con éxito. Ya estamos trabajando en su preparación.
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Te enviaremos un nuevo correo tan pronto como despachemos el paquete, incluyendo el link de seguimiento de <br> <strong>${data.shippingMethodLabel || ''}</strong>.
    </p>
  `;
  return BaseTemplate("Tu pago fue aprobado", data.storeName, content, data.statusUrl, "Ver recibo");
}

export function generateOwnerPaymentApprovedTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">Pago confirmado</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Se acredito el pago del pedido <strong>${data.orderNumber}</strong> en <strong>${data.storeName}</strong>.
    </p>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 20px; margin-top: 30px;">
      <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280;">Resumen</h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 15px; color: #374151;">
        <tr>
          <td style="padding: 8px 0;">Cliente</td>
          <td align="right" style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Total pagado</td>
          <td align="right" style="padding: 8px 0; font-weight: 800; color: #111111;">${formatCurrency(data.total, data.currency)}</td>
        </tr>
      </table>
    </div>
  `;
  return BaseTemplate("Nuevo pago confirmado", data.storeName, content, data.statusUrl, "Ver ordenes");
}

export function generatePaymentPendingTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">Pago Pendiente de Confirmación</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Recibimos la orden <strong>${data.orderNumber}</strong>, pero el pago se encuentra en estado pendiente. Dependiendo del método seleccionado, esto puede demorar unas horas.
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      No tenés que realizar ninguna acción por ahora. Te informaremos ni bien se acredite.
    </p>
  `;
  return BaseTemplate("Tu pago está en proceso", data.storeName, content, data.statusUrl, "Verificar estado");
}

export function generatePaymentFailedTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #B91C1C;">Hubo un problema con tu pago</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Lamentablemente, no pudimos procesar el pago de tu pedido <strong>${data.orderNumber}</strong>. 
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      No te preocupes, tus productos siguen esperando. Podés intentar nuevamente utilizando otro método de cobro haciendo clic en el botón de abajo.
    </p>
  `;
  return BaseTemplate("Problema con tu pago", data.storeName, content, data.statusUrl, "Reintentar Pago");
}

export function generateOrderShippedTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">¡Tu pedido va en camino!</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Tenemos buenas noticias. Tu pedido <strong>${data.orderNumber}</strong> ya ha sido entregado al transportista y se encuentra en viaje a destino.
    </p>
    
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 20px; margin-top: 30px;">
      <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280;">Información Logística</h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 15px; color: #374151;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Logística:</td>
          <td align="right" style="padding: 8px 0; font-weight: 600;">${data.shippingMethodLabel || 'Estándar'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Código de Rastreo:</td>
          <td align="right" style="padding: 8px 0; font-weight: 600;">${data.trackingCode || 'N/A'}</td>
        </tr>
      </table>
    </div>
  `;
  return BaseTemplate("Tu pedido fue despachado", data.storeName, content, data.trackingUrl || data.statusUrl, "Escanear Seguimiento");
}

export function generateOrderCancelledTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">Pedido Cancelado</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Te informamos que tu pedido <strong>${data.orderNumber}</strong> ha sido cancelado.
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Si tenías un pago pendiente o si no se hizo ningún cargo, no debés preocuparte. Si el pedido ya estaba pago, procesaremos el reembolso correspondiente a la brevedad.
    </p>
  `;
  return BaseTemplate("Tu pedido ha sido cancelado", data.storeName, content);
}

export function generatePaymentRefundedTemplate(data: OrderEmailData) {
    const content = `
      <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">Reembolso Procesado</h2>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
        Hola ${data.customerName},<br>
        Te confirmamos que hemos procesado correctamente el reembolso de tu pedido <strong>${data.orderNumber}</strong>.
      </p>
      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
        El dinero será devuelto originalmente al mismo método de pago que utilizaste. Dependiendo de tu tarjeta y de la entidad, esto puede tardar unos días en reflejarse.
      </p>
    `;
    return BaseTemplate("Hemos procesado tu reembolso", data.storeName, content);
}

export function generateOrderInTransitTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">¡Tu pedido está en camino!</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      El carrier nos avisó que tu pedido <strong>${data.orderNumber}</strong> ya se encuentra en tránsito hacia tu domicilio.
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Podés ir viendo los detalles de rastreo ingresando a nuestra página de tracking.
    </p>
  `;
  return BaseTemplate("El código de tracking se ha movido", data.storeName, content, data.trackingUrl || data.statusUrl, "Rastrear Pedido");
}

export function generateOrderDeliveredTemplate(data: OrderEmailData) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #111111;">¡Tu pedido fue entregado!</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Hola ${data.customerName},<br>
      Nos informan del sistema logístico que el pedido <strong>${data.orderNumber}</strong> ha sido marcado como entregado satisfactoriamente.
    </p>
    <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Esperamos que disfrutes de tu compra. ¡Muchas gracias por elegirnos!
    </p>
  `;
  return BaseTemplate("¡Pedido entregado con éxito!", data.storeName, content, data.statusUrl, "Ver detalles del Pedido");
}

export function generateStockCriticalTemplate(data: StockCriticalEmailData) {
  const variantLabel = data.variantTitle ? ` · <strong>${data.variantTitle}</strong>` : "";
  const skuLabel = data.sku ? `<span style="font-family: monospace; font-size: 13px; color: #6B7280;"> (SKU: ${data.sku})</span>` : "";

  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #B91C1C;">Stock crítico detectado</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Un producto de tu tienda llegó al punto de reposición tras una venta reciente.
      Reponelo antes de que se agote para no perder ventas.
    </p>

    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 20px; margin-top: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #991B1B;">
        ${data.productTitle}${variantLabel}
      </h3>
      ${skuLabel}
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 14px; font-size: 15px; color: #374151;">
        <tr>
          <td style="padding: 6px 0;">Stock actual</td>
          <td align="right" style="padding: 6px 0; font-weight: 700; color: #B91C1C;">${data.currentStock} u.</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Punto de reposición</td>
          <td align="right" style="padding: 6px 0; font-weight: 500;">${data.reorderPoint} u.</td>
        </tr>
      </table>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6B7280;">
      Entrá al panel de inventario para reponer ahora. Si el producto tiene proveedor conectado,
      podés generar la orden directamente desde Nexora.
    </p>
  `;
  return BaseTemplate(
    "Stock crítico en tu tienda",
    data.storeName,
    content,
    data.inventoryUrl,
    "Reponer stock ahora",
  );
}

export function generateAbandonedCartTemplate(data: AbandonedCartEmailData) {
  const itemRows = data.cartItems
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
            <strong>${item.title}</strong>${item.variantTitle ? ` · ${item.variantTitle}` : ""}
            <div style="font-size: 13px; color: #6B7280;">x${item.quantity}</div>
          </td>
          <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-weight: 500;">
            ${formatCurrency(item.price * item.quantity, data.currency)}
          </td>
        </tr>`,
    )
    .join("");

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111111;">Hola ${data.customerName || "cliente"}, dejaste algo en tu carrito</h2>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #374151;">
      Guardamos tu selección en ${data.storeName}. Si aún querés completar la compra, seguí donde la dejaste con un clic.
    </p>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; font-size: 15px; color: #374151;">
      ${itemRows}
      <tr>
        <td style="padding: 16px 0 0 0; font-weight: 700;">Subtotal</td>
        <td align="right" style="padding: 16px 0 0 0; font-weight: 700;">${formatCurrency(data.subtotal, data.currency)}</td>
      </tr>
    </table>

    <p style="margin: 28px 0 0 0; font-size: 13px; color: #9CA3AF;">
      Si no reconocés esta compra podés ignorar este correo.
    </p>
  `;
  return BaseTemplate(
    `Completá tu compra en ${data.storeName}`,
    data.storeName,
    content,
    data.recoveryUrl,
    "Retomar mi compra",
  );
}
