'use strict';
// FILE: backend/controllers/emailCampaignController.js

const Guardian    = require('../models/Guardian');
const Student     = require('../models/Student');
const Application = require('../models/Application');
const { Offer, AuditLog } = require('../models/index');
const { sendEmail }       = require('../utils/email');
const AppError            = require('../utils/AppError');
const logger              = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT RESOLVER
// Returns a list of guardian documents matching the segment rule.
// ─────────────────────────────────────────────────────────────────────────────
const resolveSegment = async (segment) => {
  switch (segment) {

    case 'no_children': {
      // Guardians who have ZERO active student profiles
      const withKids = await Student.distinct('guardian', { isActive: true });
      return Guardian.find({ isActive: true, _id: { $nin: withKids } })
        .select('firstName lastName email').lean();
    }

    case 'no_application': {
      // Guardians who added at least one student but submitted ZERO applications
      const withKids = await Student.distinct('guardian',     { isActive: true });
      const withApps = await Application.distinct('guardian');
      return Guardian.find({ isActive: true, _id: { $in: withKids, $nin: withApps } })
        .select('firstName lastName email').lean();
    }

    case 'offer_expired': {
      // Guardians whose offer is still "issued" but expiryDate has passed
      const expiredGuardianIds = await Offer.distinct('guardian', {
        status:     'issued',
        expiryDate: { $lt: new Date() },
      });
      return Guardian.find({ isActive: true, _id: { $in: expiredGuardianIds } })
        .select('firstName lastName email').lean();
    }

    case 'all_guardians': {
      return Guardian.find({ isActive: true })
        .select('firstName lastName email').lean();
    }

    default:
      return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED EMAIL WRAPPER
// Wraps the admin-written body inside the ScholarsGate HTML email template.
// The greeting "Dear [firstName]," is added here automatically.
// ─────────────────────────────────────────────────────────────────────────────
// ── Sanitize body — strips markdown artifacts that sneak in from copy-paste ──
const sanitizeBody = (html) => {
  return html
    // Fix markdown links inside href: href="[text](url)" → href="url"
    .replace(/href="\[([^\]]+)\]\(([^)]+)\)"/g, 'href="$2"')
    // Fix markdown links as text content: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip any remaining markdown bold **text** → text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Strip markdown italic *text* → text
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
};

const wrapInTemplate = ({ firstName, subject, previewText, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
  <style>body{margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;}a{color:#c9a84c;}</style>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;">

  <!-- Hidden preview text -->
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0e1a 0%,#141c35 60%,#1a2448 100%);padding:36px 40px 28px;">
            <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#c9a84c;letter-spacing:1px;">ScholarsGate</div>
            <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#888;margin-top:4px;">Elite USA Admissions</div>
          </td>
        </tr>

        <!-- Gold rule -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#c9a84c,#e8c96a,#c9a84c);"></td></tr>

        <!-- Auto greeting — uses parent's real first name -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Dear <strong>${firstName}</strong>,</p>
          </td>
        </tr>

        <!-- Admin-written body -->
        <tr>
          <td style="padding:12px 40px 28px;">
            <div style="font-size:15px;color:#4a4a6a;line-height:1.85;">${bodyHtml}</div>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);"></div>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding:0 40px 32px;">
            <a href="${process.env.APP_URL}/parent/dashboard"
              style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c96a);
              color:#0a0e1a;padding:14px 36px;border-radius:8px;text-decoration:none;
              font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;
              font-family:'Jost',sans-serif;">
              Go to My Dashboard
            </a>
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding:0 40px 28px;">
            <p style="font-size:14px;color:#4a4a6a;margin:0 0 4px;">Warm regards,</p>
            <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0;">The ScholarsGate Admissions Team</p>
            <p style="font-size:12px;color:#c9a84c;margin:4px 0 0;">supports@schoolgatess.com</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0e1a;padding:24px 40px;border-radius:0 0 16px 16px;">
            <p style="font-size:11px;color:#444;margin:0;text-align:center;">
              © ${new Date().getFullYear()} ScholarsGate — Elite USA Admissions Platform
            </p>
            <p style="font-size:11px;color:#333;margin:6px 0 0;text-align:center;">
              Questions? <a href="mailto:supports@schoolgatess.com" style="color:#c9a84c;">supports@schoolgatess.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/email-campaigns — Dashboard page
// ─────────────────────────────────────────────────────────────────────────────
exports.getCampaignPage = async (req, res) => {
  const [withKids, withApps, expiredIds, total] = await Promise.all([
    Student.distinct('guardian', { isActive: true }),
    Application.distinct('guardian'),
    Offer.distinct('guardian', { status: 'issued', expiryDate: { $lt: new Date() } }),
    Guardian.countDocuments({ isActive: true }),
  ]);

  const [noChildrenCount, noAppCount, expiredCount] = await Promise.all([
    Guardian.countDocuments({ isActive: true, _id: { $nin: withKids } }),
    Guardian.countDocuments({ isActive: true, _id: { $in: withKids, $nin: withApps } }),
    Guardian.countDocuments({ isActive: true, _id: { $in: expiredIds } }),
  ]);

  const segments = [
    {
      id:          'no_children',
      label:       'Registered — No Student Profile',
      description: 'Parents who signed up but have not yet added any child profile.',
      icon:        'fa-user-clock',
      color:       'warning',
      count:       noChildrenCount,
    },
    {
      id:          'no_application',
      label:       'Profile Added — Never Applied',
      description: 'Parents who added a student profile but have not submitted any application.',
      icon:        'fa-file-circle-xmark',
      color:       'info',
      count:       noAppCount,
    },
    {
      id:          'offer_expired',
      label:       'Offer Expired — No Action Taken',
      description: 'Parents who received an offer letter but it expired before they accepted.',
      icon:        'fa-clock',
      color:       'danger',
      count:       expiredCount,
    },
    {
      id:          'all_guardians',
      label:       'All Active Parents (Broadcast)',
      description: 'Send to every registered and active parent on the platform.',
      icon:        'fa-users',
      color:       'gold',
      count:       total,
    },
  ];

  const history = await AuditLog.find({ action: 'EMAIL_CAMPAIGN_SENT' })
    .sort({ createdAt: -1 }).limit(20).lean();

  res.render('dashboards/admin/email-campaigns', { title: 'Email Campaigns', segments, history });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/email-campaigns/preview?segment=xxx
// Returns recipient count + 5 sample names — used by "Preview Audience" button
// ─────────────────────────────────────────────────────────────────────────────
exports.previewSegment = async (req, res, next) => {
  const { segment } = req.query;
  const guardians   = await resolveSegment(segment);
  res.json({
    success: true,
    count:   guardians.length,
    sample:  guardians.slice(0, 5).map(g => ({
      name:  `${g.firstName} ${g.lastName}`,
      email: g.email,
    })),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/email-campaigns/search-guardians?q=xxx
// Searches guardians by name or email for the "Send to Individual" tab
// ─────────────────────────────────────────────────────────────────────────────
exports.searchGuardians = async (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, guardians: [] });

  const regex    = new RegExp(q, 'i');
  const guardians = await Guardian.find({
    isActive: true,
    $or: [
      { firstName: regex },
      { lastName:  regex },
      { email:     regex },
    ],
  }).select('firstName lastName email country').limit(20).lean();

  res.json({ success: true, guardians });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/email-campaigns/send
// Handles both segment (bulk) and individual sends
// ─────────────────────────────────────────────────────────────────────────────
exports.sendCampaign = async (req, res, next) => {
  const { type, segment, recipientId, recipientEmail,
          subject, bodyHtml, previewText } = req.body;

  if (!subject || !bodyHtml) {
    return next(new AppError('Subject and body are required.', 400));
  }

  // ── INDIVIDUAL SEND ────────────────────────────────────────────────────────
  if (type === 'individual') {
    if (!recipientEmail) return next(new AppError('Recipient email is required.', 400));

    const guardian = await Guardian.findOne({
      isActive: true,
      $or: [
        ...(recipientId ? [{ _id: recipientId }] : []),
        { email: recipientEmail },
      ],
    }).select('firstName lastName email').lean();

    if (!guardian) return next(new AppError('Recipient not found.', 404));

    // Replace {{firstName}} with the actual parent name
    const cleanBody  = sanitizeBody(bodyHtml);
    const personalised = cleanBody
      .replace(/\{\{firstName\}\}/g, guardian.firstName || 'Parent')
      .replace(/\{\{lastName\}\}/g,  guardian.lastName  || '')
      .replace(/\{\{fullName\}\}/g,  `${guardian.firstName || 'Parent'} ${guardian.lastName || ''}`.trim());

    try {
      await sendEmail({
        to:      guardian.email,
        subject,
        html:    wrapInTemplate({
          firstName:   guardian.firstName || 'Parent',
          subject,
          previewText: previewText || subject,
          bodyHtml:    personalised,
        }),
      });

      await AuditLog.create({
        actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
        action: 'EMAIL_CAMPAIGN_SENT', resource: 'Guardian',
        details: {
          type: 'individual', subject,
          recipientEmail: guardian.email,
          recipientName:  `${guardian.firstName} ${guardian.lastName}`,
          totalRecipients: 1, sent: 1, failed: 0,
        },
        ipAddress: req.ip,
      });

      logger.info(`Individual email sent by ${req.user.email} to ${guardian.email}`);
      return res.json({
        success: true,
        message: `Email sent to ${guardian.firstName} ${guardian.lastName}.`,
        sent: 1, failed: 0,
      });

    } catch (err) {
      logger.error(`Individual email failed for ${guardian.email}: ${err.message}`);
      return res.json({ success: false, message: 'Email failed to send. Check your SMTP settings.' });
    }
  }

  // ── SEGMENT SEND ───────────────────────────────────────────────────────────
  if (!segment) return next(new AppError('Segment is required.', 400));

  const guardians = await resolveSegment(segment);
  if (guardians.length === 0) {
    return res.json({ success: false, message: 'No recipients found for this segment.' });
  }

  let sent = 0, failed = 0;
  const errors = [];

  for (const guardian of guardians) {
    try {
      // Replace {{firstName}} {{lastName}} {{fullName}} per recipient
      const cleanBody  = sanitizeBody(bodyHtml);
      const personalised = cleanBody
        .replace(/\{\{firstName\}\}/g, guardian.firstName || 'Parent')
        .replace(/\{\{lastName\}\}/g,  guardian.lastName  || '')
        .replace(/\{\{fullName\}\}/g,  `${guardian.firstName || 'Parent'} ${guardian.lastName || ''}`.trim());

      await sendEmail({
        to:      guardian.email,
        subject,
        html:    wrapInTemplate({
          firstName:   guardian.firstName || 'Parent',
          subject,
          previewText: previewText || subject,
          bodyHtml:    personalised,
        }),
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push({ email: guardian.email, error: err.message });
      logger.error(`Campaign email failed for ${guardian.email}: ${err.message}`);
    }
  }

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
    action: 'EMAIL_CAMPAIGN_SENT', resource: 'Guardian',
    details: {
      type: 'segment', segment, subject,
      totalRecipients: guardians.length, sent, failed,
      failedEmails: errors.slice(0, 10),
    },
    ipAddress: req.ip,
  });

  logger.info(`Campaign sent by ${req.user.email} — segment: ${segment}, sent: ${sent}, failed: ${failed}`);

  return res.json({
    success: true,
    message: `Campaign sent. ${sent} delivered${failed > 0 ? `, ${failed} failed` : ''}.`,
    sent,
    failed,
  });
};
