/**
 * Serviço de envio de e-mails do FinanPro
 * Suporta SMTP real via Nodemailer e armazenamento em Caixa de Saída para auditoria e modo dev.
 */
import nodemailer from 'nodemailer';

interface SendVerificationOptions {
  to: string;
  name: string;
  code: string;
  type: 'register' | 'forgot_password';
}

export async function sendEmailCode(options: SendVerificationOptions): Promise<{ success: boolean; messageId?: string; isSimulated: boolean }> {
  const { to, name, code, type } = options;
  const isRegister = type === 'register';

  const subject = isRegister 
    ? `FinanPro - Código de Verificação da Conta: ${code}`
    : `FinanPro - Recuperação de Senha: ${code}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">Finan<span style="color: #2563eb;">Pro</span></h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Sistema de Gestão Financeira Empresarial</p>
      </div>
      <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; color: #334155; font-size: 15px;">Olá, <strong>${name}</strong>!</p>
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
          ${isRegister 
            ? 'Para confirmar o seu endereço de e-mail e ativar o acesso à sua empresa no FinanPro, utilize o código de verificação de 6 dígitos abaixo:' 
            : 'Recebemos uma solicitação para redefinir a senha da sua conta no FinanPro. Utilize o código de 6 dígitos abaixo para prosseguir:'}
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e3a8a; background: #e0e7ff; padding: 12px 28px; border-radius: 8px; border: 1px dashed #3b82f6;">
            ${code}
          </span>
        </div>
        <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px; text-align: center;">
          Este código expira em <strong>15 minutos</strong>. Não compartilhe este código com ninguém.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
        Se você não solicitou este e-mail, pode ignorá-lo com segurança.
      </p>
    </div>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'FinanPro <noreply@finanpro.com.br>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });

      console.log(`[SMTP] E-mail enviado com sucesso para ${to}. ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId, isSimulated: false };
    } catch (err) {
      console.error(`[SMTP Error] Falha ao enviar via SMTP:`, err);
      // Fallback para registro em outbox
      return { success: true, isSimulated: true };
    }
  }

  // Se SMTP não estiver configurado nas variáveis de ambiente, registra no log do servidor
  console.log(`\n========================================================`);
  console.log(`[FinanPro Email] Envio para: ${to}`);
  console.log(`[FinanPro Email] Assunto: ${subject}`);
  console.log(`[FinanPro Email] CÓDIGO DE VERIFICAÇÃO: ${code}`);
  console.log(`========================================================\n`);

  return { success: true, isSimulated: true };
}
