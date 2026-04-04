const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.emailHost || !env.emailUser) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: false,
    auth: { user: env.emailUser, pass: env.emailPass },
  });
  return transporter;
}

async function sendVerificationEmail(to, token) {
  const t = getTransporter();
  const url = `${env.clientUrl}/verify-email?token=${token}`;
  if (!t) {
    console.info('[email stub] verify:', to, url);
    return;
  }
  await t.sendMail({
    from: env.emailFrom,
    to,
    subject: 'Verify your email',
    text: `Verify: ${url}`,
    html: `<p><a href="${url}">Verify email</a></p>`,
  });
}

async function sendPasswordResetEmail(to, token) {
  const t = getTransporter();
  const url = `${env.clientUrl}/reset-password?token=${token}`;
  if (!t) {
    console.info('[email stub] reset:', to, url);
    return;
  }
  await t.sendMail({
    from: env.emailFrom,
    to,
    subject: 'Password reset',
    text: `Reset: ${url}`,
    html: `<p><a href="${url}">Reset password</a></p>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
