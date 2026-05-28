const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});

const templates = {
  welcome: (data) => ({
    subject: 'Welcome to ScholarsGate',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8e4d9; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #c9a84c; font-size: 28px; letter-spacing: 2px;">ScholarsGate</h1>
          <p style="color: #888; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">Elite USA Admissions</p>
        </div>
        <h2 style="color: #e8e4d9; margin-bottom: 16px;">Welcome, ${data.firstName}!</h2>
        <p style="color: #aaa; line-height: 1.8; margin-bottom: 24px;">
          Your ScholarsGate account has been created. You're one step closer to accessing elite USA high school scholarship opportunities for your child.
        </p>
        <a href="${data.verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #e8c96a); color: #0a0e1a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; letter-spacing: 1px;">VERIFY EMAIL</a>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">This link expires in 24 hours.</p>
      </div>
    `,
  }),
  resetPassword: (data) => ({
    subject: 'ScholarsGate — Password Reset',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8e4d9; padding: 40px; border-radius: 12px;">
        <h1 style="color: #c9a84c;">ScholarsGate</h1>
        <h2>Password Reset Request</h2>
        <p style="color: #aaa;">Hello ${data.firstName}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #e8c96a); color: #0a0e1a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">RESET PASSWORD</a>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const tpl = template && templates[template] ? templates[template](data) : { subject, html };

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'ScholarsGate'}" <${process.env.FROM_EMAIL}>`,
      to,
      subject: tpl.subject || subject,
      html: tpl.html || html,
    });

    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    throw err;
  }
};

module.exports = { sendEmail };
