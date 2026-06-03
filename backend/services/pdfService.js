// const PDFDocument = require('pdfkit');

// const generateOfferLetter = (offer, application) => {
//   return new Promise((resolve, reject) => {
//     const doc = new PDFDocument({ margin: 60, size: 'A4' });
//     const buffers = [];

//     doc.on('data', (chunk) => buffers.push(chunk));
//     doc.on('end', () => resolve(Buffer.concat(buffers)));
//     doc.on('error', reject);

//     // ─── Header ───────────────────────────────────────────
//     doc.rect(0, 0, doc.page.width, 120).fill('#0a0e1a');
//     doc.fontSize(28).fillColor('#c9a84c').font('Helvetica-Bold').text('ScholarsGate', 60, 35);
//     doc.fontSize(10).fillColor('#888888').font('Helvetica').text('ELITE USA ADMISSIONS PLATFORM', 60, 68);
//     doc.fontSize(10).fillColor('#c9a84c').text('OFFICIAL OFFER LETTER', 60, 85);

//     // Right side header info
//     doc.fillColor('#cccccc').fontSize(9)
//       .text(`Offer #: ${offer.offerNumber}`, 350, 40, { align: 'right', width: 180 })
//       .text(`Date: ${new Date(offer.offerDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 55, { align: 'right', width: 180 })
//       .text(`Valid Until: ${new Date(offer.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 70, { align: 'right', width: 180 });

//     // ─── Gold divider ─────────────────────────────────────
//     doc.moveTo(60, 135).lineTo(535, 135).strokeColor('#c9a84c').lineWidth(1.5).stroke();

//     // ─── Recipient ────────────────────────────────────────
//     doc.moveDown(1);
//     doc.fontSize(11).fillColor('#333').font('Helvetica')
//       .text('Dear Parent/Guardian,', 60, 155)
//       .moveDown(0.5)
//       .text(`We are pleased to present this Official Enrollment Offer Letter for your child's admission to:`, { width: 475 });

//     // ─── School Box ───────────────────────────────────────
//     doc.roundedRect(60, 210, 475, 80, 8).fill('#f8f5ee').stroke('#c9a84c');
//     doc.fillColor('#0a0e1a').fontSize(16).font('Helvetica-Bold')
//       .text(application.school?.name || 'Partner School', 80, 225, { align: 'center', width: 435 });
//     doc.fillColor('#666').fontSize(10).font('Helvetica')
//       .text(`${application.school?.location?.city}, ${application.school?.location?.state}, USA`, 80, 252, { align: 'center', width: 435 });

//     // ─── Scholarship Section ──────────────────────────────
//     doc.moveDown(2);
//     doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP AWARDED', 60, 310);
//     doc.moveTo(60, 328).lineTo(535, 328).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

//     const scholarshipName = application.scholarship?.name || 'Merit Scholarship';
//     const coverage = offer.scholarshipDetails?.coveragePercentage || 0;
//     const annualValue = offer.scholarshipDetails?.annualValue || 0;

//     doc.fillColor('#333').fontSize(10).font('Helvetica')
//       .text(`Scholarship:`, 60, 338).text(scholarshipName, 200, 338)
//       .text(`Coverage:`, 60, 355).fillColor('#c9a84c').font('Helvetica-Bold').text(`${coverage}%`, 200, 355)
//       .fillColor('#333').font('Helvetica')
//       .text(`Annual Value:`, 60, 372).fillColor('#2a7a2a').font('Helvetica-Bold').text(`$${annualValue.toLocaleString()}`, 200, 372)
//       .fillColor('#333').font('Helvetica')
//       .text(`Enrollment Deposit:`, 60, 389).text(`$${offer.enrollmentDeposit}`, 200, 389)
//       .text(`Academic Year:`, 60, 406).text(offer.enrollmentYear || 'Fall 2025', 200, 406);

//     // ─── Benefits ─────────────────────────────────────────
//     if (offer.scholarshipDetails?.benefits?.length) {
//       doc.moveDown(1.5);
//       doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP BENEFITS', 60, 430);
//       doc.moveTo(60, 448).lineTo(535, 448).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

//       let yPos = 458;
//       const benefits = offer.scholarshipDetails.benefits;
//       const half = Math.ceil(benefits.length / 2);

//       benefits.slice(0, half).forEach((b) => {
//         doc.fillColor('#c9a84c').fontSize(10).text('✓', 60, yPos);
//         doc.fillColor('#333').fontSize(10).font('Helvetica').text(b, 80, yPos);
//         yPos += 18;
//       });

//       benefits.slice(half).forEach((b, i) => {
//         const y = 458 + i * 18;
//         doc.fillColor('#c9a84c').fontSize(10).text('✓', 300, y);
//         doc.fillColor('#333').fontSize(10).font('Helvetica').text(b, 320, y);
//       });
//     }

//     // ─── Payment Instructions ─────────────────────────────
//     const payY = 580;
//     doc.roundedRect(60, payY, 475, 100, 8).fill('#fff8ee').stroke('#c9a84c');
//     doc.fillColor('#8a6000').fontSize(12).font('Helvetica-Bold')
//       .text('ENROLLMENT DEPOSIT REQUIRED', 80, payY + 12, { align: 'center', width: 435 });
//     doc.fillColor('#333').fontSize(10).font('Helvetica')
//       .text(`To confirm your enrollment, please submit the enrollment deposit of $${offer.enrollmentDeposit} USD via bank transfer and upload proof of payment through your ScholarsGate parent dashboard.`, 80, payY + 32, { width: 435 })
//       .text('This offer expires on: ' + new Date(offer.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 80, payY + 76, { width: 435 });

//     // ─── Footer ───────────────────────────────────────────
//     doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#0a0e1a');
//     doc.fillColor('#888').fontSize(8).font('Helvetica')
//       .text('ScholarsGate — Elite USA Admissions Platform | support@scholarsgate.com', 60, doc.page.height - 38, { align: 'center', width: doc.page.width - 120 });
//     doc.fillColor('#c9a84c').text(`Offer Letter ${offer.offerNumber} | Generated ${new Date().toLocaleDateString()}`, 60, doc.page.height - 22, { align: 'center', width: doc.page.width - 120 });

//     doc.end();
//   });
// };

// module.exports = { generateOfferLetter };


const PDFDocument = require('pdfkit');

const generateOfferLetter = (offer, application) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Pull data safely from both offer and application ──
    const schoolName     = offer.school?.name     || application.school?.name     || 'Partner School';
    const schoolCity     = offer.school?.location?.city   || application.school?.location?.city   || '';
    const schoolState    = offer.school?.location?.state  || application.school?.location?.state  || '';
    const scholarshipName = offer.scholarship?.name || application.scholarship?.name || 'Merit Scholarship';
    const studentFirst   = offer.student?.firstName  || application.student?.firstName  || '';
    const studentLast    = offer.student?.lastName   || application.student?.lastName   || '';
    const studentName    = `${studentFirst} ${studentLast}`.trim() || 'Student';
    const guardianFirst  = offer.guardian?.firstName || application.guardian?.firstName || 'Parent';
    const guardianLast   = offer.guardian?.lastName  || application.guardian?.lastName  || '';
    const guardianName   = `${guardianFirst} ${guardianLast}`.trim();

    const coverage        = offer.scholarshipDetails?.coveragePercentage || offer.scholarship?.coveragePercentage || 0;
    const annualValue     = offer.scholarshipDetails?.annualValue        || offer.scholarship?.annualValue        || 0;
    const enrollmentDeposit = offer.enrollmentDeposit || 500;
    const acceptanceFee   = offer.acceptanceFee || offer.scholarshipDetails?.acceptanceFee || 0;
    const enrollmentYear  = offer.enrollmentYear || `Fall ${new Date().getFullYear() + 1}`;
    const benefits        = offer.scholarshipDetails?.benefits || [];

    const offerDate   = new Date(offer.offerDate  || offer.createdAt || Date.now());
    const expiryDate  = new Date(offer.expiryDate || Date.now());

    const formatDate  = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Page dimensions ───────────────────────────────────
    const W = doc.page.width;
    const H = doc.page.height;

    // ── Header Background ─────────────────────────────────
    doc.rect(0, 0, W, 130).fill('#0a0e1a');

    // Logo / Brand
    doc.rect(60, 28, 50, 50).fill('#c9a84c');
    doc.fontSize(28).fillColor('#0a0e1a').font('Helvetica-Bold').text('SG', 67, 38);

    doc.fontSize(24).fillColor('#c9a84c').font('Helvetica-Bold').text('ScholarsGate', 122, 32);
    doc.fontSize(9).fillColor('#888888').font('Helvetica').text('ELITE USA ADMISSIONS PLATFORM', 122, 60);
    doc.fontSize(9).fillColor('#c9a84c').text('OFFICIAL OFFER LETTER', 122, 75);

    // Right side header info
    doc.fillColor('#cccccc').fontSize(8.5)
      .text(`Offer #: ${offer.offerNumber || 'N/A'}`,    350, 38, { align: 'right', width: 185 })
      .text(`Date: ${formatDate(offerDate)}`,             350, 54, { align: 'right', width: 185 })
      .text(`Valid Until: ${formatDate(expiryDate)}`,     350, 70, { align: 'right', width: 185 });

    // ── Gold divider ──────────────────────────────────────
    doc.moveTo(60, 148).lineTo(535, 148).strokeColor('#c9a84c').lineWidth(1.5).stroke();

    // ── Congratulations ───────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333').font('Helvetica')
      .text(`Dear ${guardianName},`, 60, 162)
      .moveDown(0.4)
      .text(`We are delighted to extend this Official Enrollment Offer to your child,`, 60, { width: 475, continued: true })
      .font('Helvetica-Bold').fillColor('#0a0e1a')
      .text(` ${studentName}`, { continued: false })
      .moveDown(0.3)
      .font('Helvetica').fillColor('#333')
      .text(`for admission to the following institution:`, 60, { width: 475 });

    // ── School Box ────────────────────────────────────────
    doc.roundedRect(60, 218, 475, 72, 8).fill('#f8f5ee').stroke('#c9a84c');
    doc.fillColor('#0a0e1a').fontSize(17).font('Helvetica-Bold')
      .text(schoolName, 80, 232, { align: 'center', width: 435 });
    doc.fillColor('#666').fontSize(10).font('Helvetica')
      .text(`${schoolCity}${schoolCity && schoolState ? ', ' : ''}${schoolState}${schoolState ? ', USA' : 'USA'}`, 80, 256, { align: 'center', width: 435 });

    // ── Student Info Row ──────────────────────────────────
    let y = 308;
    doc.rect(60, y, 475, 36).fill('#f0f4ff').stroke('#d0d8f0');
    doc.fillColor('#1a2448').fontSize(10).font('Helvetica-Bold')
      .text('Student:', 75, y + 12, { continued: true })
      .font('Helvetica').fillColor('#333')
      .text(`  ${studentName}`, { continued: true })
      .font('Helvetica-Bold').fillColor('#1a2448')
      .text('     Academic Year:', { continued: true })
      .font('Helvetica').fillColor('#333')
      .text(`  ${enrollmentYear}`);

    // ── Scholarship Section ───────────────────────────────
    y = 360;
    doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP AWARDED', 60, y);
    doc.moveTo(60, y + 18).lineTo(535, y + 18).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

    y += 26;
    const col1 = 60;
    const col2 = 210;
    const rowH = 18;

    const rows = [
      ['Scholarship Name:', scholarshipName],
      ['Type:', (offer.scholarshipDetails?.scholarshipType || offer.scholarship?.type || 'Merit').toUpperCase()],
      ['Coverage:', `${coverage}% of tuition`],
      ['Annual Scholarship Value:', `$${annualValue.toLocaleString()} USD`],
    ];

    if (acceptanceFee > 0) {
      rows.push(['Acceptance Fee:', `$${acceptanceFee.toLocaleString()} USD`]);
    }
    rows.push(['Enrollment Deposit:', `$${enrollmentDeposit.toLocaleString()} USD`]);
    rows.push(['Enrollment Year:', enrollmentYear]);

    rows.forEach(([label, value], i) => {
      const rowY = y + i * rowH;
      doc.fillColor('#555').fontSize(9.5).font('Helvetica').text(label, col1, rowY);
      if (label === 'Coverage:') {
        doc.fillColor('#c9a84c').font('Helvetica-Bold').text(value, col2, rowY);
      } else if (label === 'Annual Scholarship Value:') {
        doc.fillColor('#2a7a2a').font('Helvetica-Bold').text(value, col2, rowY);
      } else {
        doc.fillColor('#222').font('Helvetica-Bold').text(value, col2, rowY);
      }
    });

    // ── Benefits ──────────────────────────────────────────
    y = y + rows.length * rowH + 16;

    if (benefits.length > 0) {
      doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP BENEFITS', 60, y);
      doc.moveTo(60, y + 18).lineTo(535, y + 18).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

      y += 26;
      const half    = Math.ceil(benefits.length / 2);
      const leftCol  = benefits.slice(0, half);
      const rightCol = benefits.slice(half);

      leftCol.forEach((b, i) => {
        doc.fillColor('#c9a84c').fontSize(9.5).text('✓', 60, y + i * 17);
        doc.fillColor('#333').font('Helvetica').text(b, 78, y + i * 17);
      });

      rightCol.forEach((b, i) => {
        doc.fillColor('#c9a84c').fontSize(9.5).text('✓', 300, y + i * 17);
        doc.fillColor('#333').font('Helvetica').text(b, 318, y + i * 17);
      });

      y += Math.max(leftCol.length, rightCol.length) * 17 + 16;
    } else {
      y += 10;
    }

    // ── Payment Instructions Box ──────────────────────────
    // Make sure we have space — add new page if needed
    if (y > H - 200) {
      doc.addPage();
      y = 60;
    }

    doc.roundedRect(60, y, 475, acceptanceFee > 0 ? 130 : 110, 8).fill('#fff8ee').stroke('#c9a84c');

    doc.fillColor('#8a6000').fontSize(11).font('Helvetica-Bold')
      .text('ENROLLMENT INSTRUCTIONS', 80, y + 12, { align: 'center', width: 435 });

    let instrY = y + 30;

    if (acceptanceFee > 0) {
      doc.fillColor('#333').fontSize(9.5).font('Helvetica-Bold')
        .text('Step 1 — Acceptance Fee:', 80, instrY)
        .font('Helvetica').fillColor('#555')
        .text(`Pay $${acceptanceFee.toLocaleString()} USD to confirm your acceptance of this offer.`, 80, instrY + 13, { width: 435 });
      instrY += 32;
      doc.fillColor('#333').fontSize(9.5).font('Helvetica-Bold')
        .text('Step 2 — Enrollment Deposit:', 80, instrY)
        .font('Helvetica').fillColor('#555')
        .text(`Pay $${enrollmentDeposit.toLocaleString()} USD to secure your child's seat.`, 80, instrY + 13, { width: 435 });
      instrY += 32;
    } else {
      doc.fillColor('#333').fontSize(9.5).font('Helvetica')
        .text(
          `To confirm your enrollment, please submit the enrollment deposit of $${enrollmentDeposit.toLocaleString()} USD via bank transfer and upload proof of payment through your ScholarsGate parent dashboard.`,
          80, instrY, { width: 435 }
        );
      instrY += 36;
    }

    doc.fillColor('#c0392b').fontSize(9).font('Helvetica-Bold')
      .text(`⚠  This offer expires on: ${formatDate(expiryDate)}`, 80, instrY, { width: 435 });

    // ── Notes ─────────────────────────────────────────────
    if (offer.notes) {
      y += acceptanceFee > 0 ? 148 : 128;
      doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
        .text(`Note from Admissions: ${offer.notes}`, 60, y, { width: 475 });
    }

    // ── Signature Section ─────────────────────────────────
    const sigY = H - 130;
    doc.moveTo(60, sigY).lineTo(535, sigY).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

    doc.fillColor('#333').fontSize(9.5).font('Helvetica')
      .text('Issued by ScholarsGate Admissions Team', 60, sigY + 10)
      .text(`Date Issued: ${formatDate(offerDate)}`, 60, sigY + 26);

    doc.fillColor('#0a0e1a').fontSize(9.5).font('Helvetica-Bold')
      .text('ScholarsGate', 380, sigY + 10)
      .font('Helvetica').fillColor('#666')
      .text('support@scholarsgate.com', 380, sigY + 26)
      .text('www.scholarsgate.com', 380, sigY + 42);

    // ── Footer ────────────────────────────────────────────
    doc.rect(0, H - 52, W, 52).fill('#0a0e1a');
    doc.fillColor('#888').fontSize(7.5).font('Helvetica')
      .text(
        'ScholarsGate — Elite USA Admissions Platform  |  support@scholarsgate.com  |  This document is confidential and intended solely for the named recipient.',
        60, H - 36,
        { align: 'center', width: W - 120 }
      );
    doc.fillColor('#c9a84c').fontSize(7.5)
      .text(
        `Offer Letter ${offer.offerNumber || ''}  |  Generated ${formatDate(new Date())}`,
        60, H - 20,
        { align: 'center', width: W - 120 }
      );

    doc.end();
  });
};

module.exports = { generateOfferLetter };