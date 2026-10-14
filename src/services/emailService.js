import { EmailClient } from '@azure/communication-email';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure Communication Services - Email Notification Service
 * Credentials are strictly read from process.env (NOT hardcoded in code)
 */

let emailClient = null;

function getEmailClient() {
  if (emailClient) return emailClient;

  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  if (!connectionString || !connectionString.trim()) {
    console.warn('⚠️ AZURE_COMMUNICATION_CONNECTION_STRING is not set. Email notifications will be skipped.');
    return null;
  }

  try {
    emailClient = new EmailClient(connectionString.trim());
    return emailClient;
  } catch (err) {
    console.error('❌ Failed to initialize Azure Communication Services EmailClient:', err.message);
    return null;
  }
}

/**
 * Generate a responsive, professional HTML email template for SHE System
 */
function generateEmailHtml({ title, message, senderName, type, recipientName }) {
  const brandColor = '#A04830';
  const secondaryColor = '#CC902D';
  const dateStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const typeLabels = {
    ALERT: '🚨 แจ้งเตือนเร่งด่วน',
    DEFECT: '⚠️ รายงานอุปกรณ์ชำรุด',
    TASK: '📋 งานที่ได้รับมอบหมาย',
    PASSWORD_RESET: '🔑 รีเซ็ทรหัสผ่าน',
    SYSTEM: '📢 ประกาศจากระบบ'
  };

  const badgeText = typeLabels[type] || '🔔 แจ้งเตือนจากระบบ';

  return `
  <!DOCTYPE html>
  <html lang="th">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Prompt', sans-serif; background-color: #FCF9F4; margin: 0; padding: 24px; color: #3F3A31; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E8DFC8; }
      .header { background: linear-gradient(135deg, ${brandColor}, #803A26); padding: 28px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 28px 24px; }
      .badge { display: inline-block; background-color: #F7EEDC; color: ${brandColor}; font-size: 12px; font-weight: bold; padding: 5px 12px; border-radius: 20px; border: 1px solid #E8DFC8; margin-bottom: 16px; }
      .title { font-size: 18px; font-weight: bold; color: #2D2924; margin: 0 0 12px 0; }
      .greeting { font-size: 14px; color: #5C5951; margin-bottom: 16px; }
      .message-box { background: #FCF9F4; border-left: 4px solid ${brandColor}; padding: 16px 18px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #3F3A31; white-space: pre-wrap; }
      .meta { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #E8DFC8; font-size: 12px; color: #8C7454; }
      .footer { background: #F7EEDC; padding: 18px 24px; text-align: center; font-size: 11px; color: #8C7454; }
      .footer a { color: ${brandColor}; text-decoration: none; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>JDE Peet's &bull; SHE System</h1>
        <p>Safety, Health and Environment Management System</p>
      </div>
      <div class="content">
        <span class="badge">${badgeText}</span>
        <h2 class="title">${title}</h2>
        ${recipientName ? `<div class="greeting">เรียน คุณ<strong>${recipientName}</strong>,</div>` : ''}
        <div class="message-box">${message}</div>
        <div class="meta">
          <div><strong>ผู้ส่ง:</strong> ${senderName || 'ระบบบริหารความปลอดภัย (SHE System)'}</div>
          <div><strong>เวลาที่ส่ง:</strong> ${dateStr}</div>
        </div>
      </div>
      <div class="footer">
        <p>อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ SHE System กรุณาอย่าตอบกลับอีเมลนี้โดยตรง</p>
        <p>&copy; ${new Date().getFullYear()} JDE Peet's. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Send an email directly via Azure Communication Services
 */
export async function sendEmail({ to, subject, title, message, senderName, type = 'SYSTEM', recipientName }) {
  const client = getEmailClient();
  if (!client) {
    return { success: false, error: 'EmailClient is not initialized (missing connection string)' };
  }

  const senderAddress = process.env.AZURE_COMMUNICATION_SENDER_EMAIL;
  if (!senderAddress || !senderAddress.trim()) {
    console.warn('⚠️ AZURE_COMMUNICATION_SENDER_EMAIL is not set. Skipping email send.');
    return { success: false, error: 'AZURE_COMMUNICATION_SENDER_EMAIL is not configured' };
  }

  // Format recipient list
  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList
    .map(r => (typeof r === 'string' ? { address: r.trim(), displayName: recipientName || r.trim() } : r))
    .filter(r => r.address && r.address.includes('@'));

  if (validRecipients.length === 0) {
    return { success: false, error: 'No valid recipient email addresses provided' };
  }

  const emailSubject = subject || `[SHE System] ${title}`;
  const htmlContent = generateEmailHtml({ title, message, senderName, type, recipientName });
  const plainText = `${title}\n\n${message}\n\nผู้ส่ง: ${senderName || 'SHE System'}\nเวลา: ${new Date().toISOString()}`;

  const emailMessage = {
    senderAddress: senderAddress.trim(),
    content: {
      subject: emailSubject,
      plainText,
      html: htmlContent
    },
    recipients: {
      to: validRecipients
    }
  };

  try {
    const poller = await client.beginSend(emailMessage);
    console.log(`✉️ Email queued via Azure Communication Services to ${validRecipients.map(r => r.address).join(', ')} (Status ID: ${poller.id || 'ok'})`);
    return { success: true, messageId: poller.id };
  } catch (err) {
    console.error(`❌ Failed to send email via Azure Communication Services to ${validRecipients.map(r => r.address).join(', ')}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * High-level helper: Given notification data, finds user emails from Azure SQL and sends email
 * Runs safely in background without throwing errors to caller
 */
export async function dispatchNotificationEmail(queryFn, { recipient_user_id, target_role, title, message, type = 'SYSTEM', sender_name }) {
  try {
    const recipients = [];

    if (recipient_user_id) {
      const res = await queryFn(
        'SELECT id, username, full_name, email FROM dbo.users WHERE id = @recipient_user_id AND email IS NOT NULL AND LTRIM(RTRIM(email)) <> \'\'',
        { recipient_user_id }
      );
      if (res.recordset && res.recordset.length > 0) {
        recipients.push(...res.recordset);
      }
    } else if (target_role) {
      let roleQuery = '';
      if (target_role === 'ALL') {
        roleQuery = 'SELECT id, username, full_name, email FROM dbo.users WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> \'\' AND status = \'approved\'';
      } else if (target_role === 'P3') {
        roleQuery = 'SELECT id, username, full_name, email FROM dbo.users WHERE role IN (\'P3\', \'P4\') AND email IS NOT NULL AND LTRIM(RTRIM(email)) <> \'\' AND status = \'approved\'';
      } else {
        roleQuery = 'SELECT id, username, full_name, email FROM dbo.users WHERE role = @target_role AND email IS NOT NULL AND LTRIM(RTRIM(email)) <> \'\' AND status = \'approved\'';
      }
      const res = await queryFn(roleQuery, { target_role });
      if (res.recordset && res.recordset.length > 0) {
        recipients.push(...res.recordset);
      }
    }

    if (recipients.length === 0) {
      return;
    }

    // Send emails concurrently to each recipient
    for (const user of recipients) {
      if (user.email && user.email.includes('@')) {
        sendEmail({
          to: user.email.trim(),
          recipientName: user.full_name || user.username,
          title,
          message,
          type,
          senderName: sender_name
        }).catch(err => {
          console.error(`Error sending email to ${user.email}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ Error during notification email dispatch:', err.message);
  }
}
