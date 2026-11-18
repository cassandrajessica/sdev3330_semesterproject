const RESEND_URL = 'https://api.resend.com/emails';
// Resend lets you send from this address to your own email before your domain is verified.
const DEFAULT_FROM = 'HeyCiti <onboarding@resend.dev>';

// Sends one email through Resend, or prints it in the server terminal when there is no API key.
async function deliver({ to, subject, html, text, consoleNote }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[dev email] ${consoleNote}`);
    return { sent: false, method: 'console' };
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend error ${response.status}: ${errorBody}`);
  }

  return { sent: true, method: 'resend' };
}

/**
 * Email a password reset link.
 *
 * With RESEND_API_KEY set, the email is sent through Resend.
 * Without it (local development), the link is printed in the server terminal instead.
 *
 * @returns {Promise<{ sent: boolean, method: 'resend' | 'console' }>}
 */
export function sendPasswordResetEmail({ to, resetUrl }) {
  return deliver({
    to,
    subject: 'Reset your HeyCiti password',
    consoleNote: `Password reset link for ${to}: ${resetUrl}`,
    html: `
      <p>Hi there,</p>
      <p>We got a request to reset your HeyCiti password. This link works for 1 hour:</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>If the button does not work, copy this link into your browser:<br>${resetUrl}</p>
      <p>If you did not ask for this, you can ignore this email and your password will stay the same.</p>
    `,
    text: `We got a request to reset your HeyCiti password. This link works for 1 hour:\n\n${resetUrl}\n\nIf you did not ask for this, you can ignore this email and your password will stay the same.`,
  });
}
