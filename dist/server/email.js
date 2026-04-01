import nodemailer from 'nodemailer';
// Check if SMTP is configured
const isSmtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
// Create a transporter - using Ethereal service for testing
// In production, use real SMTP credentials (Gmail, SendGrid, etc.)
let transporter = null;
if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    // Test connection
    transporter.verify((error, success) => {
        if (error) {
            console.error('Email transporter error:', error);
        }
        else if (success) {
            console.log('✅ Email transporter ready');
        }
    });
}
else {
    console.log('⚠️  SMTP not configured - emails will be logged to console only');
    console.log('📧 To enable real emails, set SMTP_USER and SMTP_PASS in .env file');
}
export async function sendPasswordResetEmail(to, name, resetToken) {
    // Build reset URL - adjust the domain based on your deployment
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
          .content { margin: 20px 0; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Restablecer tu Contraseña</h2>
          </div>
          
          <div class="content">
            <p>Hola ${name},</p>
            
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si tú hiciste esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña:</p>
            
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            
            <p class="warning">Este enlace expira en 1 hora por razones de seguridad.</p>
            
            <p>Si no solicitaste un restablecimiento de contraseña, puedes ignorar este email. Tu contraseña no será modificada.</p>
          </div>
          
          <div class="footer">
            <p>Este es un email automático. Por favor no respondas a este mensaje.</p>
            <p>© ${new Date().getFullYear()} Evento Manager. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    // If SMTP is not configured, log the reset link to console
    if (!isSmtpConfigured || !transporter) {
        console.log('\n' + '='.repeat(80));
        console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
        console.log('='.repeat(80));
        console.log(`Para: ${to}`);
        console.log(`Nombre: ${name}`);
        console.log(`\n🔗 Enlace de Restablecimiento de Contraseña:`);
        console.log(`\n   ${resetUrl}\n`);
        console.log('⏰ Este enlace expira en 1 hora');
        console.log('='.repeat(80) + '\n');
        return;
    }
    // Send real email if SMTP is configured
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@eventoapp.com',
            to,
            subject: 'Restablecer tu Contraseña - Evento Manager',
            html: htmlContent,
            text: `
        Hola ${name},
        
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
        
        Accede a este enlace para cambiar tu contraseña:
        ${resetUrl}
        
        Este enlace expira en 1 hora.
        
        Si no solicitaste esto, ignora este email.
      `
        });
        console.log('✅ Password reset email sent:', info.messageId);
    }
    catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw new Error('Failed to send email');
    }
}
export async function sendEventSignupConfirmationEmail(to, userName, eventTitle, eventDate, eventTime, eventLocation, confirmationNumber, companionsCount = 0) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const eventUrl = `${baseUrl}/events`;
    const attendeeCount = companionsCount + 1;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; }
          .content { margin: 20px 0; }
          .event-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #555; }
          .confirmation-box { background-color: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50; margin: 20px 0; }
          .confirmation-number { font-size: 18px; font-weight: bold; color: #4caf50; font-family: monospace; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666; }
          .status-badge { display: inline-block; background-color: #4caf50; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>¡Inscripción Confirmada!</h2>
            <p style="margin: 10px 0 0 0; color: #666;">Tu registro ha sido completado correctamente</p>
          </div>
          
          <div class="content">
            <p>Hola ${userName},</p>
            
            <p>Te confirmamos que te has inscrito correctamente en el siguiente evento:</p>
            
            <div class="event-details">
              <h3 style="margin-top: 0;">${eventTitle}</h3>
              <div class="detail-row">
                <span class="detail-label">📅 Fecha:</span> ${eventDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">🕐 Hora:</span> ${eventTime}
              </div>
              ${eventLocation ? `<div class="detail-row">
                <span class="detail-label">📍 Ubicación:</span> ${eventLocation}
              </div>` : ''}
              <div class="detail-row">
                <span class="detail-label">👥 Asistentes:</span> ${attendeeCount} ${attendeeCount === 1 ? 'persona' : 'personas'}
              </div>
            </div>
            
            <div class="confirmation-box">
              <p style="margin-top: 0; color: #555;"><strong>Número de Confirmación:</strong></p>
              <p class="confirmation-number">${confirmationNumber}</p>
              <p style="margin-bottom: 0; font-size: 12px; color: #999;">Guarda este número para tu referencia</p>
            </div>
            
            <p><span class="status-badge">✓ APROBADO</span></p>
            
            <p>Si necesitas realizar cambios en tu inscripción o tienes alguna pregunta, puedes acceder a tu perfil de eventos en cualquier momento.</p>
            
            <a href="${eventUrl}" class="button">Ver mis Eventos</a>
            
            <p style="font-size: 12px; color: #999; margin-top: 20px;">Este es un email automático generado por el sistema. Por favor, no respondas a este mensaje.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Evento Manager. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    // If SMTP is not configured, log to console
    if (!isSmtpConfigured || !transporter) {
        console.log('\n' + '='.repeat(80));
        console.log('📧 EVENT SIGNUP CONFIRMATION EMAIL (Development Mode)');
        console.log('='.repeat(80));
        console.log(`Para: ${to}`);
        console.log(`Nombre: ${userName}`);
        console.log(`\n📍 Evento: ${eventTitle}`);
        console.log(`📅 Fecha: ${eventDate}`);
        console.log(`🕐 Hora: ${eventTime}`);
        if (eventLocation)
            console.log(`📍 Ubicación: ${eventLocation}`);
        console.log(`👥 Asistentes: ${attendeeCount}`);
        console.log(`\n✓ Número de Confirmación: ${confirmationNumber}`);
        console.log('='.repeat(80) + '\n');
        return;
    }
    // Send real email if SMTP is configured
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@eventoapp.com',
            to,
            subject: `Inscripción Confirmada - ${eventTitle}`,
            html: htmlContent,
            text: `
        ¡Inscripción Confirmada!
        
        Hola ${userName},
        
        Te confirmamos que te has inscrito correctamente en el siguiente evento:
        
        Evento: ${eventTitle}
        Fecha: ${eventDate}
        Hora: ${eventTime}
        ${eventLocation ? `Ubicación: ${eventLocation}` : ''}
        Asistentes: ${attendeeCount}
        
        Número de Confirmación: ${confirmationNumber}
        
        Estado: APROBADO
        
        Guarda este número para tu referencia.
        
        Este es un email automático. Por favor no respondas a este mensaje.
        © ${new Date().getFullYear()} Evento Manager. Todos los derechos reservados.
      `
        });
        console.log('✅ Event signup confirmation email sent:', info.messageId);
    }
    catch (error) {
        console.error('❌ Failed to send event signup confirmation email:', error);
        throw new Error('Failed to send email');
    }
}
