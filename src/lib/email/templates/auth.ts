/**
 * Auth-related email templates.
 * Uses a Nexora-branded base layout consistent with order templates.
 */

const NexoraBaseTemplate = (title: string, content: string, ctaUrl?: string, ctaText?: string) => `
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
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; background-color: #111111;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">nexora.</h1>
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
                    <a href="${ctaUrl}" style="display: inline-block; padding: 16px 32px; background-color: #111111; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 6px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); letter-spacing: -0.2px;">
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
              <p style="margin: 0 0 10px 0;">Nexora &mdash; Infraestructura B2B para operadores serios.</p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">Si no creaste esta cuenta, podés ignorar este correo.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export function generateEmailVerificationTemplate(data: {
  userName: string;
  verifyUrl: string;
}) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #111111;">Bienvenido a Nexora</h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
      Hola ${data.userName || ""},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
      Gracias por elegir Nexora como la plataforma de tu operación. Estamos construyendo la infraestructura que tu negocio necesita para escalar sin fricciones.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
      Para activar tu cuenta y comenzar, necesitamos verificar tu dirección de correo electrónico. Hacé clic en el botón de abajo:
    </p>

    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 16px; margin-top: 24px; margin-bottom: 8px;">
      <p style="margin: 0; font-size: 13px; color: #6B7280; line-height: 1.5;">
        Este enlace expira en 24 horas. Si no lo solicitaste, podés ignorar este correo de forma segura.
      </p>
    </div>
  `;

  return NexoraBaseTemplate(
    "Verificá tu email — Nexora",
    content,
    data.verifyUrl,
    "Verificar mi email"
  );
}

export function generateEmailVerificationResendTemplate(data: {
  userName: string;
  verifyUrl: string;
}) {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #111111;">Nuevo enlace de verificación</h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
      Hola ${data.userName || ""},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
      Solicitaste un nuevo enlace para verificar tu correo electrónico en Nexora. Hacé clic en el botón de abajo para completar la verificación:
    </p>

    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 16px; margin-top: 24px; margin-bottom: 8px;">
      <p style="margin: 0; font-size: 13px; color: #6B7280; line-height: 1.5;">
        Este enlace expira en 24 horas.
      </p>
    </div>
  `;

  return NexoraBaseTemplate(
    "Verificá tu email — Nexora",
    content,
    data.verifyUrl,
    "Verificar mi email"
  );
}
