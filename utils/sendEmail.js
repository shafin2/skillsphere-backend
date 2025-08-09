const nodemailer = require('nodemailer');

function createTransporter() {
  const { EMAIL, PASSWORD } = process.env;
  if (!EMAIL || !PASSWORD) {
    throw new Error('EMAIL and PASSWORD env vars are required for sending emails');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL,
      pass: PASSWORD
    }
  });
}

function buildResetPasswordTemplate({ name, resetLink }) {
  const safeName = name || 'there';
  return `
  <div style="background:#f6f9fc;padding:30px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 24px;color:white;">
        <h1 style="margin:0;font-size:22px;">SkillSphere</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">Password Reset Request</p>
      </div>
      <div style="padding:24px 24px 8px 24px;">
        <p style="font-size:16px;margin:0 0 12px 0;">Hi ${safeName},</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">We received a request to reset your password. Click the button below to choose a new password. This link expires in 1 hour.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0 0 16px 0;">If you did not request this, you can safely ignore this email.</p>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;">© ${new Date().getFullYear()} SkillSphere. All rights reserved.</p>
      </div>
    </div>
  </div>
  `;
}

function buildVerifyEmailTemplate({ name, verifyLink }) {
  const safeName = name || 'there';
  return `
  <div style="background:#f6f9fc;padding:30px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#06b6d4,#6366f1);padding:24px 24px;color:white;">
        <h1 style="margin:0;font-size:22px;">SkillSphere</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">Verify your email</p>
      </div>
      <div style="padding:24px 24px 8px 24px;">
        <p style="font-size:16px;margin:0 0 12px 0;">Welcome ${safeName},</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 12px 0;">Please confirm your email address to activate your SkillSphere account.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${verifyLink}" style="display:inline-block;background:#06b6d4;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0 0 16px 0;">This link expires in 24 hours.</p>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;">© ${new Date().getFullYear()} SkillSphere. All rights reserved.</p>
      </div>
    </div>
  </div>
  `;
}

async function sendResetPasswordEmail({ to, name, resetLink }) {
  const transporter = createTransporter();
  const from = `SkillSphere <${process.env.EMAIL}>`;
  const html = buildResetPasswordTemplate({ name, resetLink });
  await transporter.sendMail({ from, to, subject: 'Reset your SkillSphere password', html });
}

async function sendVerifyEmail({ to, name, verifyLink }) {
  const transporter = createTransporter();
  const from = `SkillSphere <${process.env.EMAIL}>`;
  const html = buildVerifyEmailTemplate({ name, verifyLink });
  await transporter.sendMail({ from, to, subject: 'Confirm your email for SkillSphere', html });
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransporter();
  const from = `SkillSphere <${process.env.EMAIL}>`;
  await transporter.sendMail({ from, to, subject, html });
}

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendVerifyEmail
}; 