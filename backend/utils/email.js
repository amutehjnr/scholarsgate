const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});

// ─── Status display helpers ─────────────────────────────────────────────────
const STATUS_LABELS = {
  draft:                'Draft',
  submitted:            'Submitted',
  under_review:         'Under Review',
  shortlisted:          'Shortlisted',
  interview_scheduled:  'Interview Scheduled',
  interview_done:       'Interview Completed',
  accepted:             'Accepted',
  rejected:             'Not Selected',
  waitlisted:           'Waitlisted',
  withdrawn:            'Withdrawn',
};

const STATUS_COLORS = {
  accepted:             '#1a6b2a',
  shortlisted:          '#6432b4',
  interview_scheduled:  '#1a3a6a',
  interview_done:       '#1a3a6a',
  under_review:         '#8a6000',
  waitlisted:           '#c9a84c',
  rejected:             '#c0392b',
  withdrawn:            '#888888',
  submitted:            '#1a3a6a',
  draft:                '#888888',
};

const STATUS_ICONS = {
  accepted:             '🎉',
  shortlisted:          '⭐',
  interview_scheduled:  '📅',
  interview_done:       '✅',
  under_review:         '🔍',
  waitlisted:           '⏳',
  rejected:             '📋',
  withdrawn:            '↩️',
  submitted:            '📩',
};

// ─── Templates ──────────────────────────────────────────────────────────────
const templates = {

  welcome: (data) => ({
    subject: 'Welcome to ScholarsGate — Verify Your Email',
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
    subject: 'ScholarsGate — Password Reset Request',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8e4d9; padding: 40px; border-radius: 12px;">
        <h1 style="color: #c9a84c;">ScholarsGate</h1>
        <h2>Password Reset Request</h2>
        <p style="color: #aaa;">Hello ${data.firstName}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #e8c96a); color: #0a0e1a; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">RESET PASSWORD</a>
      </div>
    `,
  }),

  applicationStatusUpdate: (data) => {
    const statusLabel  = STATUS_LABELS[data.status]  || data.status.replace(/_/g, ' ');
    const statusColor  = STATUS_COLORS[data.status]  || '#888888';
    const statusIcon   = STATUS_ICONS[data.status]   || '🔔';

    // Build contextual message per status
    const contextMessages = {
      under_review:        'Our admissions team has begun reviewing your application. We will keep you updated on any developments.',
      shortlisted:         'Congratulations! Your child has been shortlisted for this scholarship. This is a significant achievement — we will reach out with next steps shortly.',
      interview_scheduled: 'An interview has been scheduled for your child. Please check your dashboard for the interview details and prepare accordingly.',
      interview_done:      'The interview stage for your child\'s application has been completed. Our team is now deliberating and will notify you of the outcome soon.',
      accepted:            '🎊 Wonderful news! Your child\'s application has been accepted. Please log in to your dashboard to review and accept the offer letter.',
      rejected:            'After careful consideration, we regret to inform you that your child\'s application was not selected at this time. We encourage you to explore other scholarship opportunities on our platform.',
      waitlisted:          'Your child has been placed on the waitlist for this scholarship. We will notify you immediately if a place becomes available.',
      withdrawn:           'Your application has been marked as withdrawn. If this was done in error, please contact our support team.',
    };

    const contextMessage = contextMessages[data.status] || 'Your application status has been updated. Please log in to your dashboard for full details.';

    return {
      subject: `${statusIcon} Application Update — ${statusLabel} | ScholarsGate`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
        <body style="margin:0;padding:0;background:#f5f4f0;font-family:'Georgia',serif;">

          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0a0e1a 0%,#141c35 60%,#1a2448 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-family:'Georgia',serif;font-size:28px;font-weight:700;color:#c9a84c;letter-spacing:2px;margin-bottom:4px;">ScholarsGate</div>
              <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888;">Elite USA Admissions</div>
            </div>

            <!-- Status Badge -->
            <div style="background:${statusColor};padding:20px 40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:6px;">${statusIcon}</div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">${statusLabel}</div>
            </div>

            <!-- Body -->
            <div style="padding:40px;">
              <p style="font-size:16px;color:#1a1a2e;margin-bottom:8px;">Dear ${data.guardianName},</p>
              <p style="font-size:15px;color:#4a4a6a;line-height:1.8;margin-bottom:28px;">${contextMessage}</p>

              <!-- Application Info Card -->
              <div style="background:#faf8f3;border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:24px;margin-bottom:28px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#8a8aaa;margin-bottom:16px;">Application Details</div>

                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#8a8aaa;text-transform:uppercase;letter-spacing:1px;width:40%;border-bottom:1px solid rgba(0,0,0,0.06);">Reference</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid rgba(0,0,0,0.06);font-family:monospace;">#${data.applicationNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#8a8aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(0,0,0,0.06);">School</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid rgba(0,0,0,0.06);">${data.schoolName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#8a8aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(0,0,0,0.06);">Scholarship</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid rgba(0,0,0,0.06);">${data.scholarshipName || 'General Application'}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#8a8aaa;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(0,0,0,0.06);">Student</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid rgba(0,0,0,0.06);">${data.studentName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#8a8aaa;text-transform:uppercase;letter-spacing:1px;">Updated</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a1a2e;">${data.updatedAt}</td>
                  </tr>
                </table>
              </div>

              ${data.note ? `
              <!-- Admin Note -->
              <div style="background:rgba(201,168,76,0.06);border-left:3px solid #c9a84c;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8a6000;margin-bottom:6px;">Note from Admissions Team</div>
                <p style="font-size:14px;color:#4a4a6a;line-height:1.7;margin:0;">${data.note}</p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${data.dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0a0e1a;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;">View Application</a>
              </div>

              <p style="font-size:13px;color:#8a8aaa;line-height:1.7;text-align:center;">
                Questions? Reply to this email or contact us at<br/>
                <a href="mailto:support@scholarsgate.com" style="color:#c9a84c;text-decoration:none;">support@scholarsgate.com</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#0a0e1a;padding:24px 40px;text-align:center;">
              <p style="font-size:11px;color:#444;margin:0;">© ${new Date().getFullYear()} ScholarsGate — Elite USA Admissions Platform</p>
              <p style="font-size:11px;color:#333;margin:8px 0 0;">You are receiving this because you have an active application on ScholarsGate.</p>
            </div>

          </div>
        </body>
        </html>
      `,
    };
  },
};

// ─── Send function ───────────────────────────────────────────────────────────
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
