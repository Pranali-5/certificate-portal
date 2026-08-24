import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION });
const fromEmail = process.env.SES_FROM_EMAIL ?? '';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"`]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '`': '&#96;' })[
        character
      ] ?? character,
  );

export async function sendNotificationEmail({
  to,
  subject,
  name,
  message,
}: {
  to: string;
  subject: string;
  name: string;
  message: string;
}) {
  if (!fromEmail) {
    console.warn('SES_FROM_EMAIL is not configured; email notification skipped');
    return;
  }
  try {
    const safeName = escapeHtml(name);
    const safeMessage = escapeHtml(message);
    await ses.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: `Hi ${name},\n\n${message}\n\nCivicert`, Charset: 'UTF-8' },
            Html: {
              Data: `<p>Hi ${safeName},</p><p>${safeMessage}</p><p>Civicert</p>`,
              Charset: 'UTF-8',
            },
          },
        },
      }),
    );
  } catch (error) {
    console.warn('SES notification failed:', error instanceof Error ? error.message : error);
  }
}
