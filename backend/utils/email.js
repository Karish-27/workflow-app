const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[email] SMTP not fully configured — emails will be logged to console only.');
    cachedTransporter = {
      sendMail: async (opts) => {
        console.log('\n=== EMAIL (dev fallback) ===');
        console.log('To:', opts.to);
        console.log('Subject:', opts.subject);
        console.log('Body:\n', opts.text || opts.html);
        console.log('=== END EMAIL ===\n');
        return { messageId: 'dev-' + Date.now() };
      },
    };
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'WorkFlow <no-reply@workflow.app>';
  return transporter.sendMail({ from, to, subject, html, text });
}

function appUrl(path = '') {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return base + path;
}

async function sendVerificationEmail(user, rawToken) {
  const link = appUrl(`/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`);
  return sendEmail({
    to: user.email,
    subject: 'Verify your WorkFlow email',
    html: `
      <p>Hi ${user.name || ''},</p>
      <p>Please verify your email by clicking the link below. It expires in 24 hours.</p>
      <p><a href="${link}">Verify email</a></p>
      <p>If you didn't sign up, you can safely ignore this email.</p>
    `,
    text: `Verify your email: ${link}`,
  });
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = appUrl(`/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`);
  return sendEmail({
    to: user.email,
    subject: 'Reset your WorkFlow password',
    html: `
      <p>Hi ${user.name || ''},</p>
      <p>A password reset was requested. The link below expires in 1 hour.</p>
      <p><a href="${link}">Reset password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
    text: `Reset your password: ${link}`,
  });
}

async function sendInviteEmail({ email, inviter, organization, rawToken, role }) {
  const link = appUrl(`/accept-invite?token=${rawToken}&email=${encodeURIComponent(email)}`);
  return sendEmail({
    to: email,
    subject: `You've been invited to ${organization.name} on WorkFlow`,
    html: `
      <p>Hi,</p>
      <p>${inviter.name || inviter.email} invited you to join <b>${organization.name}</b> on WorkFlow as <b>${role}</b>.</p>
      <p>This invitation expires in 7 days.</p>
      <p><a href="${link}">Accept invitation</a></p>
    `,
    text: `Accept your invitation: ${link}`,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
};
