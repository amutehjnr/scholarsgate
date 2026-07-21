'use strict';

const Guardian      = require('../models/Guardian');
const Student       = require('../models/Student');
const Application   = require('../models/Application');
const { Offer, AuditLog } = require('../models/index');
const { sendEmail } = require('../utils/email');
const AppError      = require('../utils/AppError');
const logger        = require('../utils/logger');

// ─── Segment definitions ─────────────────────────────────────────────────────
//
//  1. no_children      — registered but never added a student profile
//  2. no_application   — added student(s) but never submitted any application
//  3. offer_expired    — had an offer issued but it expired before accepting
//  4. all_guardians    — every active guardian (broadcast)
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Helper: resolve a segment to a list of guardian documents ────────────────
const resolveSegment = async (segment) => {
  switch (segment) {

    case 'no_children': {
      // Guardians who have zero active student profiles
      const withChildren = await Student.distinct('guardian', { isActive: true });
      return Guardian.find({
        isActive: true,
        _id: { $nin: withChildren },
      }).select('firstName lastName email').lean();
    }

    case 'no_application': {
      // Guardians who have at least one student but zero applications
      const withChildren = await Student.distinct('guardian', { isActive: true });
      const withApps     = await Application.distinct('guardian');
      return Guardian.find({
        isActive: true,
        _id: { $in: withChildren, $nin: withApps },
      }).select('firstName lastName email').lean();
    }

    case 'offer_expired': {
      // Guardians whose offer(s) have expired and were never accepted/confirmed
      const expiredOffers = await Offer.find({
        expiryDate: { $lt: new Date() },
        status: { $in: ['issued'] },          // still issued = never acted on
      }).distinct('guardian');

      return Guardian.find({
        isActive: true,
        _id: { $in: expiredOffers },
      }).select('firstName lastName email').lean();
    }

    case 'all_guardians': {
      return Guardian.find({ isActive: true })
        .select('firstName lastName email').lean();
    }

    default:
      return [];
  }
};

// ── GET /admin/email-campaigns — dashboard page ──────────────────────────────
exports.getCampaignPage = async (req, res) => {
  // Count each segment so admin can see audience sizes before sending
  const [withChildren, withApps, expiredGuardians, total] = await Promise.all([
    Student.distinct('guardian', { isActive: true }),
    Application.distinct('guardian'),
    Offer.find({ expiryDate: { $lt: new Date() }, status: 'issued' }).distinct('guardian'),
    Guardian.countDocuments({ isActive: true }),
  ]);

  const noChildrenCount   = await Guardian.countDocuments({ isActive: true, _id: { $nin: withChildren } });
  const noApplicationCount = await Guardian.countDocuments({ isActive: true, _id: { $in: withChildren, $nin: withApps } });
  const offerExpiredCount  = await Guardian.countDocuments({ isActive: true, _id: { $in: expiredGuardians } });

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
      description: 'Parents who added a student profile but have not submitted any scholarship application.',
      icon:        'fa-file-circle-xmark',
      color:       'info',
      count:       noApplicationCount,
    },
    {
      id:          'offer_expired',
      label:       'Offer Expired — No Action Taken',
      description: 'Parents who received an offer letter but it expired before they accepted.',
      icon:        'fa-clock',
      color:       'danger',
      count:       offerExpiredCount,
    },
    {
      id:          'all_guardians',
      label:       'All Active Parents (Broadcast)',
      description: 'Send to every registered and active guardian on the platform.',
      icon:        'fa-users',
      color:       'gold',
      count:       total,
    },
  ];

  // Fetch recent send history from audit log
  const history = await AuditLog.find({ action: 'EMAIL_CAMPAIGN_SENT' })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.render('dashboards/admin/email-campaigns', {
    title:    'Email Campaigns',
    segments,
    history,
  });
};

// ── GET /admin/email-campaigns/preview?segment=xxx — AJAX audience preview ───
exports.previewSegment = async (req, res, next) => {
  const { segment } = req.query;
  const guardians = await resolveSegment(segment);

  res.json({
    success: true,
    count:   guardians.length,
    sample:  guardians.slice(0, 5).map(g => ({
      name:  `${g.firstName} ${g.lastName}`,
      email: g.email,
    })),
  });
};

// ── POST /admin/email-campaigns/send — send the campaign ─────────────────────
exports.sendCampaign = async (req, res, next) => {
  const { segment, subject, bodyHtml, previewText } = req.body;

  if (!segment || !subject || !bodyHtml) {
    return next(new AppError('Segment, subject, and message body are required.', 400));
  }

  const guardians = await resolveSegment(segment);

  if (guardians.length === 0) {
    return res.json({ success: false, message: 'No recipients found for this segment.' });
  }

  // Send emails — fire-and-forget per guardian so one failure doesn't kill the batch
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const guardian of guardians) {
    try {
      const personalised = bodyHtml
        .replace(/\{\{firstName\}\}/g, guardian.firstName || 'Parent')
        .replace(/\{\{lastName\}\}/g,  guardian.lastName  || '')
        .replace(/\{\{fullName\}\}/g,  `${guardian.firstName || 'Parent'} ${guardian.lastName || ''}`.trim());

      await sendEmail({
        to:       guardian.email,
        subject,
        html:     wrapInTemplate({
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

  // Log the campaign in audit trail
  await AuditLog.create({
    actor:      req.user._id,
    actorModel: 'Admin',
    actorEmail: req.user.email,
    action:     'EMAIL_CAMPAIGN_SENT',
    resource:   'Guardian',
    details: {
      segment,
      subject,
      totalRecipients: guardians.length,
      sent,
      failed,
      failedEmails: errors.slice(0, 10),   // store first 10 failures only
    },
    ipAddress: req.ip,
  });

  logger.info(`Campaign sent by ${req.user.email} — segment: ${segment}, sent: ${sent}, failed: ${failed}`);

  res.json({
    success: true,
    message: `Campaign sent. ${sent} delivered${failed > 0 ? `, ${failed} failed` : ''}.`,
    sent,
    failed,
  });
};

// ── Branded email wrapper ─────────────────────────────────────────────────────
const wrapInTemplate = ({ firstName, subject, previewText, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin:0;padding:0;background:#f5f4f0;font-family:'Georgia',serif; }
    a    { color:#c9a84c; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&zwnj;&nbsp;‌&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0e1a 0%,#141c35 60%,#1a2448 100%);padding:36px 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#c9a84c;letter-spacing:1px;">ScholarsGate</div>
                    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#888;margin-top:4px;">Elite USA Admissions</div>
                  </td>
                  <td align="right">
                    <div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#c9a84c,#e8c96a);display:inline-flex;align-items:center;justify-content:center;font-family:'Georgia',serif;font-size:1.3rem;font-weight:700;color:#0a0e1a;line-height:40px;text-align:center;">S</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold rule -->
          <tr><td style="height:3px;background:linear-gradient(90deg,#c9a84c,#e8c96a,#c9a84c);"></td></tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Dear ${firstName},</p>
            </td>
          </tr>

          <!-- Body (admin-composed HTML) -->
          <tr>
            <td style="padding:16px 40px 32px;">
              <div style="font-size:15px;color:#4a4a6a;line-height:1.85;">
                ${bodyHtml}
              </div>
            </td>
          </tr>

          <!-- CTA divider -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);"></div>
            </td>
          </tr>

          <!-- Dashboard link -->
          <tr>
            <td align="center" style="padding:0 40px 36px;">
              <a href="${process.env.APP_URL}/parent/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0a0e1a;
                padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;
                font-size:13px;letter-spacing:2px;text-transform:uppercase;">
                Go to My Dashboard
              </a>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="font-size:14px;color:#4a4a6a;margin:0 0 4px;">Warm regards,</p>
              <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0;">The ScholarsGate Admissions Team</p>
              <p style="font-size:12px;color:#8a8aaa;margin:4px 0 0;">
                <a href="mailto:supports@schoolgatess.com" style="color:#c9a84c;text-decoration:none;">supports@schoolgatess.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0e1a;padding:24px 40px;border-radius:0 0 16px 16px;">
              <p style="font-size:11px;color:#444;margin:0 0 6px;text-align:center;">
                © ${new Date().getFullYear()} ScholarsGate — Elite USA Admissions Platform
              </p>
              <p style="font-size:11px;color:#333;margin:0;text-align:center;">
                You received this because you have an account at ScholarsGate.
                <br/>Questions? Email us at
                <a href="mailto:supports@schoolgatess.com" style="color:#c9a84c;text-decoration:none;">supports@schoolgatess.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
