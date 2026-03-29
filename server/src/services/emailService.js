const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

async function sendVerificationEmail(to, token) {
  const t = getTransporter();
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  if (!t) {
    console.info('[email stub] verify:', to, url);
    return;
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@streamvault.local',
    to,
    subject: 'Verify your email',
    text: `Verify: ${url}`,
    html: `<p><a href="${url}">Verify email</a></p>`,
  });
}

async function sendPasswordResetEmail(to, token) {
  const t = getTransporter();
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  if (!t) {
    console.info('[email stub] reset:', to, url);
    return;
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@streamvault.local',
    to,
    subject: 'Password reset',
    text: `Reset: ${url}`,
    html: `<p><a href="${url}">Reset password</a></p>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
