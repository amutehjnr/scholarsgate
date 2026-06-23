'use strict';

const PDFDocument = require('pdfkit');

// ─── Colour palette (matches ScholarsGate brand) ────────────────────────────
const C = {
  obsidian:  '#0a0e1a',
  navy:      '#141c35',
  navyLight: '#1e2d58',
  gold:      '#c9a84c',
  goldLight: '#e8c96a',
  goldDim:   '#8a6b2a',
  ivory:     '#f7f4ed',
  white:     '#ffffff',
  muted:     '#888888',
  mutedDark: '#555555',
  text:      '#1a1a2e',
  textSoft:  '#4a4a6a',
  success:   '#1a6b2a',
  border:    '#e0d5b7',
  lightBg:   '#faf8f3',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n ? `$${Number(n).toLocaleString('en-US')}` : '—');
const fmtDate = (d, opts = {}) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', ...opts }) : '—';

/**
 * Draw a filled rectangle helper.
 * PDFKit's rect() returns the doc for chaining; fill() applies colour.
 */
const fillRect = (doc, x, y, w, h, color) => {
  doc.save().rect(x, y, w, h).fill(color).restore();
};

/**
 * Draw a horizontal rule.
 */
const hRule = (doc, x, y, w, color = C.border, thickness = 0.5) => {
  doc.save()
    .moveTo(x, y).lineTo(x + w, y)
    .strokeColor(color).lineWidth(thickness).stroke()
    .restore();
};

/**
 * Draw a two-column key/value row inside a table block.
 * Returns the new y position after the row.
 */
const tableRow = (doc, x, y, w, label, value, opts = {}) => {
  const {
    labelColor  = C.muted,
    valueColor  = C.text,
    labelSize   = 8,
    valueSize   = 9,
    rowHeight   = 20,
    labelWidth  = 160,
    bold        = false,
    bg          = null,
  } = opts;

  if (bg) fillRect(doc, x, y, w, rowHeight, bg);

  doc.font('Helvetica').fontSize(labelSize).fillColor(labelColor)
     .text(label.toUpperCase(), x + 10, y + 6, { width: labelWidth });

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(valueSize).fillColor(valueColor)
     .text(value || '—', x + labelWidth + 10, y + 5, { width: w - labelWidth - 20 });

  hRule(doc, x, y + rowHeight, w, '#eeeeee', 0.3);
  return y + rowHeight;
};

// ─── Main generator ──────────────────────────────────────────────────────────
const generateOfferLetter = (offer, application) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: 'A4',
      info: {
        Title:    `Offer Letter — ${offer.offerNumber}`,
        Author:   'ScholarsGate',
        Subject:  'Scholarship Enrollment Offer',
        Keywords: 'scholarship, enrollment, offer, ScholarsGate',
      },
    });

    const buffers = [];
    doc.on('data',  (chunk) => buffers.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = doc.page.width;   // 595.28
    const H = doc.page.height;  // 841.89
    const M = 50;               // side margin
    const CW = W - 2 * M;       // content width

    // ─── Convenience shortcuts ──────────────────────────────────────────────
    const school       = application?.school       || offer?.school       || {};
    const scholarship  = application?.scholarship  || offer?.scholarship  || {};
    const student      = application?.student      || offer?.student      || {};
    const guardian     = application?.guardian     || offer?.guardian     || {};
    const sd           = offer?.scholarshipDetails || {};

    const studentName   = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';
    const guardianName  = [guardian.firstName, guardian.lastName].filter(Boolean).join(' ') || 'Parent/Guardian';
    const schoolName    = school.name  || 'Partner School';
    const schlName      = scholarship.name || sd.scholarshipType || 'Merit Scholarship';
    const schoolCity    = school.location?.city  || '';
    const schoolState   = school.location?.state || '';
    const schoolLoc     = [schoolCity, schoolState, 'USA'].filter(Boolean).join(', ');

    const coverage       = sd.coveragePercentage  || scholarship.coveragePercentage  || 0;
    const annualValue    = sd.annualValue          || scholarship.annualValue          || 0;
    const remainTuition  = sd.remainingTuition     || scholarship.remainingTuition     || 0;
    const acceptanceFee  = offer.acceptanceFee     || sd.acceptanceFee                 || 0;
    const deposit        = offer.enrollmentDeposit || 500;
    const benefits       = sd.benefits             || [];
    const enrollYear     = offer.enrollmentYear    || `Fall ${new Date().getFullYear() + 1}`;
    const startDate      = offer.startDate         ? fmtDate(offer.startDate)          : enrollYear;

    // ────────────────────────────────────────────────────────────────────────
    //  PAGE 1 — COVER
    // ────────────────────────────────────────────────────────────────────────

    // ── Dark header band ────────────────────────────────────────────────────
    fillRect(doc, 0, 0, W, 140, C.obsidian);

    // Gold side accent
    fillRect(doc, 0, 0, 5, 140, C.gold);

    // Logo / brand
    doc.font('Helvetica-Bold').fontSize(24).fillColor(C.gold)
       .text('ScholarsGate', M, 32, { width: 280 });

    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('ELITE USA ADMISSIONS PLATFORM', M, 60, { characterSpacing: 2 });

    // Right-side header info block
    const hInfoX = W - M - 180;
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('OFFER NUMBER',    hInfoX, 28, { width: 180 })
       .fillColor(C.gold)
       .font('Helvetica-Bold').fontSize(10)
       .text(offer.offerNumber || '—', hInfoX, 40, { width: 180 });

    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('ISSUE DATE',      hInfoX, 62, { width: 180 })
       .fillColor(C.ivory).fontSize(8)
       .text(fmtDate(offer.offerDate || new Date()), hInfoX, 73, { width: 180 });

    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('VALID UNTIL',     hInfoX, 90, { width: 180 })
       .fillColor(offer.expiryDate && new Date(offer.expiryDate) < new Date() ? '#e74c3c' : C.goldLight)
       .fontSize(8)
       .text(fmtDate(offer.expiryDate), hInfoX, 101, { width: 180 });

    // "OFFICIAL OFFER LETTER" watermark text (bottom of header)
    doc.font('Helvetica-Bold').fontSize(7).fillColor('rgba(201,168,76,0.5)')
       .text('OFFICIAL ENROLLMENT OFFER LETTER', M, 122, { characterSpacing: 3 });

    // ── Gold divider ─────────────────────────────────────────────────────────
    doc.save()
       .moveTo(0, 140).lineTo(W, 140)
       .strokeColor(C.gold).lineWidth(2).stroke()
       .restore();

    // ── School badge strip ───────────────────────────────────────────────────
    fillRect(doc, 0, 142, W, 52, C.lightBg);

    // School avatar circle
    doc.save()
       .circle(M + 18, 142 + 26, 18)
       .fillColor(C.navy)
       .fill()
       .restore();

    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.gold)
       .text(schoolName.charAt(0), M + 10, 142 + 15, { width: 16, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.text)
       .text(schoolName, M + 46, 142 + 10, { width: CW - 46 });
    doc.font('Helvetica').fontSize(9).fillColor(C.textSoft)
       .text(schoolLoc, M + 46, 142 + 26, { width: CW - 46 });

    hRule(doc, 0, 194, W, C.border);

    // ── Congratulations block ────────────────────────────────────────────────
    let y = 215;

    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.text)
       .text('Congratulations!', M, y);

    y += 28;
    doc.font('Helvetica').fontSize(10).fillColor(C.textSoft)
       .text(
         `Dear ${guardianName},`,
         M, y, { width: CW }
       );

    y += 18;
    doc.font('Helvetica').fontSize(10).fillColor(C.textSoft).lineGap(3)
       .text(
         `We are delighted to present this Official Enrollment Offer Letter on behalf of ${schoolName}. ` +
         `Following a thorough review of ${studentName}'s application, our admissions committee has ` +
         `selected ${studentName} to receive the scholarship detailed below for the ${enrollYear} academic year.`,
         M, y, { width: CW }
       );

    y += 56;

    // ── Scholarship highlight card ───────────────────────────────────────────
    const cardH = 110;
    // card bg
    fillRect(doc, M, y, CW, cardH, C.navy);
    // gold left bar
    fillRect(doc, M, y, 4, cardH, C.gold);
    // subtle pattern overlay (dots via small circles)
    for (let cx = M + 20; cx < M + CW; cx += 18) {
      for (let cy = y + 10; cy < y + cardH; cy += 18) {
        doc.save().circle(cx, cy, 0.8).fill('rgba(255,255,255,0.04)').restore();
      }
    }

    // Coverage %
    doc.font('Helvetica-Bold').fontSize(38).fillColor(C.gold)
       .text(`${coverage}%`, M + 16, y + 18, { width: 90, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
       .text('COVERAGE', M + 16, y + 62, { width: 90, align: 'center', characterSpacing: 1.5 });

    // Divider
    doc.save()
       .moveTo(M + 108, y + 14).lineTo(M + 108, y + cardH - 14)
       .strokeColor('rgba(255,255,255,0.1)').lineWidth(1).stroke()
       .restore();

    // Scholarship name & school
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ivory)
       .text(schlName, M + 120, y + 14, { width: CW - 130 });
    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
       .text(schoolName, M + 120, y + 32, { width: CW - 130 });

    // Annual value row
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('Annual Scholarship Value', M + 120, y + 54, { width: CW - 130 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.goldLight)
       .text(fmt(annualValue) + ' USD', M + 120, y + 64, { width: CW - 130 });

    // Enrollment year
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text(`Enrollment: ${enrollYear}`, M + 120, y + 88, { width: CW - 130 });

    y += cardH + 20;

    // ── Student details section ──────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
       .text('STUDENT INFORMATION', M, y, { characterSpacing: 1.5 });

    y += 14;
    hRule(doc, M, y, CW, C.border);
    y += 8;

    // Two column layout for student info
    const colW = (CW - 20) / 2;
    const studentFields = [
      ['Student Name',        studentName],
      ['Nationality',         student.nationality || '—'],
      ['Date of Birth',       student.dateOfBirth ? fmtDate(student.dateOfBirth) : '—'],
      ['Intended Grade',      student.intendedGrade ? `Grade ${student.intendedGrade}` : '—'],
    ];
    const appFields = [
      ['Application Ref.',   `#${application?.applicationNumber || offer?.offerNumber || '—'}`],
      ['Academic Year',       enrollYear],
      ['Start Date',          startDate],
      ['GPA',                 student.gpa ? `${student.gpa} / 4.0` : '—'],
    ];

    const startY = y;
    studentFields.forEach((f, i) => {
      const fy = startY + i * 22;
      doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
         .text(f[0].toUpperCase(), M, fy, { width: colW, characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
         .text(f[1], M, fy + 10, { width: colW });
    });

    appFields.forEach((f, i) => {
      const fy = startY + i * 22;
      doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
         .text(f[0].toUpperCase(), M + colW + 20, fy, { width: colW, characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
         .text(f[1], M + colW + 20, fy + 10, { width: colW });
    });

    y = startY + studentFields.length * 22 + 16;

    // ── Benefits section (page 1 bottom) ─────────────────────────────────────
    if (benefits.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
         .text('SCHOLARSHIP BENEFITS', M, y, { characterSpacing: 1.5 });
      y += 14;
      hRule(doc, M, y, CW, C.border);
      y += 10;

      // Grid of benefit chips (3 per row)
      const chipW  = (CW - 16) / 3;
      const chipH  = 20;
      benefits.forEach((b, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx  = M + col * (chipW + 8);
        const by  = y + row * (chipH + 6);

        fillRect(doc, bx, by, chipW, chipH, C.lightBg);
        doc.save()
           .rect(bx, by, chipW, chipH)
           .strokeColor(C.border).lineWidth(0.5).stroke()
           .restore();

        // Checkmark
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.success)
           .text('✓', bx + 6, by + 6, { width: 12 });
        doc.font('Helvetica').fontSize(7.5).fillColor(C.text)
           .text(b, bx + 20, by + 6, { width: chipW - 26 });
      });

      y += Math.ceil(benefits.length / 3) * (chipH + 6) + 12;
    }

    // ── Page 1 footer ────────────────────────────────────────────────────────
    const footerY = H - 50;
    fillRect(doc, 0, footerY, W, 50, C.obsidian);
    hRule(doc, 0, footerY, W, C.gold, 1.5);

    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
       .text(
         'ScholarsGate — Elite USA Admissions Platform  |  support@scholarsgate.com  |  Page 1 of 2',
         M, footerY + 10, { width: CW, align: 'center' }
       );
    doc.font('Helvetica').fontSize(7).fillColor('#333')
       .text(
         `Offer #${offer.offerNumber}  |  Generated ${fmtDate(new Date())}  |  CONFIDENTIAL`,
         M, footerY + 26, { width: CW, align: 'center' }
       );

    // ────────────────────────────────────────────────────────────────────────
    //  PAGE 2 — FINANCIAL DETAILS, PAYMENT, TERMS & SIGNATURE
    // ────────────────────────────────────────────────────────────────────────
    doc.addPage();

    // ── Page 2 header (compact) ──────────────────────────────────────────────
    fillRect(doc, 0, 0, W, 56, C.obsidian);
    fillRect(doc, 0, 0, 5, 56, C.gold);

    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.gold)
       .text('ScholarsGate', M, 14);
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text('OFFICIAL ENROLLMENT OFFER LETTER — CONTINUED', M, 32, { characterSpacing: 1.5 });

    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
       .text(`Offer #${offer.offerNumber}  |  ${studentName}  |  ${schoolName}`, W - M - 240, 22, { width: 240, align: 'right' });

    doc.save()
       .moveTo(0, 56).lineTo(W, 56)
       .strokeColor(C.gold).lineWidth(1.5).stroke()
       .restore();

    y = 76;

    // ── Financial breakdown table ────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
       .text('FINANCIAL BREAKDOWN', M, y, { characterSpacing: 1.5 });

    y += 14;
    fillRect(doc, M, y, CW, 22, C.navy);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ivory)
       .text('ITEM', M + 10, y + 7, { width: 180 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ivory)
       .text('AMOUNT (USD)', M + 190, y + 7, { width: 120 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ivory)
       .text('NOTES', M + 320, y + 7, { width: CW - 320 });
    y += 22;

    const finRows = [
      ['Annual Tuition (full)', fmt(school.tuition?.annual || 0), 'Total annual cost at partner school'],
      ['Scholarship Value', `(${fmt(annualValue)})`, `${coverage}% coverage — ${schlName}`],
      remainTuition > 0 ? ['Remaining Family Tuition', fmt(remainTuition), 'Your share per academic year'] : null,
      acceptanceFee > 0 ? ['Acceptance Fee', fmt(acceptanceFee), 'Due upon accepting this offer (one-time)'] : null,
      ['Enrollment Deposit', fmt(deposit), 'Secures your seat — applied to first year'],
    ].filter(Boolean);

    finRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? C.lightBg : C.white;
      fillRect(doc, M, y, CW, 20, bg);
      hRule(doc, M, y + 20, CW, '#eeeeee', 0.3);

      const isScholarship = row[0].startsWith('Scholarship');
      doc.font(isScholarship ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(8.5)
         .fillColor(isScholarship ? C.success : C.text)
         .text(row[0], M + 10, y + 6, { width: 175 });
      doc.font('Helvetica-Bold').fontSize(8.5)
         .fillColor(isScholarship ? C.success : C.text)
         .text(row[1], M + 190, y + 6, { width: 115 });
      doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
         .text(row[2], M + 320, y + 6, { width: CW - 325 });
      y += 20;
    });

    // Total row
    fillRect(doc, M, y, CW, 24, C.navy);
    const netPayable = (acceptanceFee || 0) + deposit;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ivory)
       .text('TOTAL FEES DUE TO CONFIRM ENROLLMENT', M + 10, y + 7, { width: 300 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.gold)
       .text(fmt(netPayable), M + 310, y + 6, { width: 120 });
    y += 24;

    y += 18;

    // ── Payment instructions box ──────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
       .text('PAYMENT INSTRUCTIONS', M, y, { characterSpacing: 1.5 });

    y += 14;
    const piH = acceptanceFee > 0 ? 120 : 88;
    fillRect(doc, M, y, CW, piH, '#fffef8');
    doc.save().rect(M, y, CW, piH).strokeColor(C.gold).lineWidth(0.8).stroke().restore();
    fillRect(doc, M, y, 4, piH, C.gold);

    let py = y + 10;

    if (acceptanceFee > 0) {
      // Step 1 — Acceptance fee
      fillRect(doc, M + 12, py, 18, 18, C.gold);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.obsidian)
         .text('1', M + 12, py + 4, { width: 18, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
         .text(`Pay Acceptance Fee — ${fmt(acceptanceFee)}`, M + 36, py + 3);
      doc.font('Helvetica').fontSize(8).fillColor(C.textSoft)
         .text('Transfer the acceptance fee to confirm intent to enroll. Upload proof via your dashboard.', M + 36, py + 15, { width: CW - 50 });
      py += 34;
    }

    // Step 2 — Enrollment deposit
    const stepNum = acceptanceFee > 0 ? '2' : '1';
    fillRect(doc, M + 12, py, 18, 18, C.gold);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.obsidian)
       .text(stepNum, M + 12, py + 4, { width: 18, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text(`Submit Enrollment Deposit — ${fmt(deposit)}`, M + 36, py + 3);
    doc.font('Helvetica').fontSize(8).fillColor(C.textSoft)
       .text('Transfer the enrollment deposit to officially secure your child\'s place. Upload proof via your parent dashboard within the validity period.', M + 36, py + 15, { width: CW - 50 });
    py += 36;

    // Step 3 — Admin verification
    const stepNum2 = acceptanceFee > 0 ? '3' : '2';
    fillRect(doc, M + 12, py, 18, 18, C.navy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gold)
       .text(stepNum2, M + 12, py + 4, { width: 18, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text('Verification & Confirmation (24–48 hours)', M + 36, py + 3);
    doc.font('Helvetica').fontSize(8).fillColor(C.textSoft)
       .text('Our team verifies your payment and officially confirms enrollment. You will receive a confirmation email.', M + 36, py + 15, { width: CW - 50 });

    y += piH + 16;

    // ── Offer validity alert ─────────────────────────────────────────────────
    fillRect(doc, M, y, CW, 28, '#fff8e0');
    doc.save().rect(M, y, CW, 28).strokeColor(C.gold).lineWidth(0.6).stroke().restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#8a6000')
       .text(`⚠  This offer expires on ${fmtDate(offer.expiryDate)}. Failure to respond by this date will result in the offer being automatically rescinded.`,
             M + 10, y + 8, { width: CW - 20 });
    y += 28 + 16;

    // ── Terms & conditions ───────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
       .text('TERMS & CONDITIONS', M, y, { characterSpacing: 1.5 });
    y += 14;
    hRule(doc, M, y, CW, C.border);
    y += 8;

    const terms = [
      '1. This offer is non-transferable and applies solely to the named student for the specified academic year.',
      '2. Scholarship renewal is contingent on the student maintaining the required academic GPA each semester.',
      '3. The enrollment deposit is credited toward your first year and is non-refundable once processed.',
      '4. False or misleading information in the application may result in immediate revocation of this offer.',
      '5. The student must comply with all school policies, code of conduct, and academic requirements.',
      '6. ScholarsGate reserves the right to withdraw this offer if circumstances materially change prior to enrollment.',
      '7. Immigration, visa, and travel costs are the responsibility of the family unless explicitly stated as a benefit.',
    ];

    terms.forEach((t) => {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.textSoft).lineGap(2)
         .text(t, M, y, { width: CW });
      y += 14;
    });

    y += 8;

    // ── Signature block ──────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.goldDim)
       .text('AUTHORISATION', M, y, { characterSpacing: 1.5 });
    y += 14;
    hRule(doc, M, y, CW, C.border);
    y += 14;

    // Three columns: issued by, offer date, validity
    const sigColW = CW / 3 - 10;

    // Col 1 — Issued by
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('ISSUED BY', M, y, { characterSpacing: 1.2 });
    y += 12;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text('ScholarsGate Admissions Office', M, y, { width: sigColW });

    // Col 2 — Offer date
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('OFFER DATE', M + sigColW + 20, y - 12, { characterSpacing: 1.2 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text(fmtDate(offer.offerDate || new Date()), M + sigColW + 20, y, { width: sigColW });

    // Col 3 — Validity
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('VALID UNTIL', M + (sigColW + 20) * 2, y - 12, { characterSpacing: 1.2 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
       .text(fmtDate(offer.expiryDate), M + (sigColW + 20) * 2, y, { width: sigColW });

    y += 30;

    // Signature line
    hRule(doc, M, y, 160, C.text, 0.7);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('Authorised Signatory', M, y + 4);

    hRule(doc, M + CW - 160, y, 160, C.text, 0.7);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('Guardian Acceptance Signature', M + CW - 160, y + 4);

    y += 24;

    // Acceptance note
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).lineGap(2)
       .text(
         'To formally accept this offer, please log in to your ScholarsGate parent dashboard at scholarsgate.com ' +
         'and click "Accept Offer". Your digital acceptance, combined with receipt of the required deposit, ' +
         'constitutes a binding enrollment agreement.',
         M, y, { width: CW }
       );

    y += 36;

    // ── QR / reference block (bottom of page 2) ──────────────────────────────
    fillRect(doc, M, y, CW, 36, C.lightBg);
    doc.save().rect(M, y, CW, 36).strokeColor(C.border).lineWidth(0.5).stroke().restore();

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text)
       .text('OFFER REFERENCE', M + 12, y + 6, { width: 150 });
    doc.font('Helvetica').fontSize(10).fillColor(C.goldDim)
       .font('Helvetica-Bold')
       .text(offer.offerNumber, M + 12, y + 16, { width: 150 });

    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
       .text('To verify this document visit: scholarsgate.com/verify', M + 180, y + 6, { width: CW - 200 });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textSoft)
       .text(`For support: support@scholarsgate.com  |  Subject: ${offer.offerNumber}`, M + 180, y + 18, { width: CW - 200 });

    y += 36 + 10;

    // ── Page 2 footer ────────────────────────────────────────────────────────
    const f2Y = H - 50;
    fillRect(doc, 0, f2Y, W, 50, C.obsidian);
    hRule(doc, 0, f2Y, W, C.gold, 1.5);

    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
       .text(
         'ScholarsGate — Elite USA Admissions Platform  |  support@scholarsgate.com  |  Page 2 of 2',
         M, f2Y + 10, { width: CW, align: 'center' }
       );
    doc.font('Helvetica').fontSize(7).fillColor('#333')
       .text(
         `Offer #${offer.offerNumber}  |  Generated ${fmtDate(new Date())}  |  CONFIDENTIAL — DO NOT DISTRIBUTE`,
         M, f2Y + 26, { width: CW, align: 'center' }
       );

    doc.end();
  });
};

module.exports = { generateOfferLetter };