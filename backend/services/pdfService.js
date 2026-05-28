const PDFDocument = require('pdfkit');

const generateOfferLetter = (offer, application) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ─── Header ───────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill('#0a0e1a');
    doc.fontSize(28).fillColor('#c9a84c').font('Helvetica-Bold').text('ScholarsGate', 60, 35);
    doc.fontSize(10).fillColor('#888888').font('Helvetica').text('ELITE USA ADMISSIONS PLATFORM', 60, 68);
    doc.fontSize(10).fillColor('#c9a84c').text('OFFICIAL OFFER LETTER', 60, 85);

    // Right side header info
    doc.fillColor('#cccccc').fontSize(9)
      .text(`Offer #: ${offer.offerNumber}`, 350, 40, { align: 'right', width: 180 })
      .text(`Date: ${new Date(offer.offerDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 55, { align: 'right', width: 180 })
      .text(`Valid Until: ${new Date(offer.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 70, { align: 'right', width: 180 });

    // ─── Gold divider ─────────────────────────────────────
    doc.moveTo(60, 135).lineTo(535, 135).strokeColor('#c9a84c').lineWidth(1.5).stroke();

    // ─── Recipient ────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(11).fillColor('#333').font('Helvetica')
      .text('Dear Parent/Guardian,', 60, 155)
      .moveDown(0.5)
      .text(`We are pleased to present this Official Enrollment Offer Letter for your child's admission to:`, { width: 475 });

    // ─── School Box ───────────────────────────────────────
    doc.roundedRect(60, 210, 475, 80, 8).fill('#f8f5ee').stroke('#c9a84c');
    doc.fillColor('#0a0e1a').fontSize(16).font('Helvetica-Bold')
      .text(application.school?.name || 'Partner School', 80, 225, { align: 'center', width: 435 });
    doc.fillColor('#666').fontSize(10).font('Helvetica')
      .text(`${application.school?.location?.city}, ${application.school?.location?.state}, USA`, 80, 252, { align: 'center', width: 435 });

    // ─── Scholarship Section ──────────────────────────────
    doc.moveDown(2);
    doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP AWARDED', 60, 310);
    doc.moveTo(60, 328).lineTo(535, 328).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

    const scholarshipName = application.scholarship?.name || 'Merit Scholarship';
    const coverage = offer.scholarshipDetails?.coveragePercentage || 0;
    const annualValue = offer.scholarshipDetails?.annualValue || 0;

    doc.fillColor('#333').fontSize(10).font('Helvetica')
      .text(`Scholarship:`, 60, 338).text(scholarshipName, 200, 338)
      .text(`Coverage:`, 60, 355).fillColor('#c9a84c').font('Helvetica-Bold').text(`${coverage}%`, 200, 355)
      .fillColor('#333').font('Helvetica')
      .text(`Annual Value:`, 60, 372).fillColor('#2a7a2a').font('Helvetica-Bold').text(`$${annualValue.toLocaleString()}`, 200, 372)
      .fillColor('#333').font('Helvetica')
      .text(`Enrollment Deposit:`, 60, 389).text(`$${offer.enrollmentDeposit}`, 200, 389)
      .text(`Academic Year:`, 60, 406).text(offer.enrollmentYear || 'Fall 2025', 200, 406);

    // ─── Benefits ─────────────────────────────────────────
    if (offer.scholarshipDetails?.benefits?.length) {
      doc.moveDown(1.5);
      doc.fillColor('#0a0e1a').fontSize(13).font('Helvetica-Bold').text('SCHOLARSHIP BENEFITS', 60, 430);
      doc.moveTo(60, 448).lineTo(535, 448).strokeColor('#e0d5b7').lineWidth(0.5).stroke();

      let yPos = 458;
      const benefits = offer.scholarshipDetails.benefits;
      const half = Math.ceil(benefits.length / 2);

      benefits.slice(0, half).forEach((b) => {
        doc.fillColor('#c9a84c').fontSize(10).text('✓', 60, yPos);
        doc.fillColor('#333').fontSize(10).font('Helvetica').text(b, 80, yPos);
        yPos += 18;
      });

      benefits.slice(half).forEach((b, i) => {
        const y = 458 + i * 18;
        doc.fillColor('#c9a84c').fontSize(10).text('✓', 300, y);
        doc.fillColor('#333').fontSize(10).font('Helvetica').text(b, 320, y);
      });
    }

    // ─── Payment Instructions ─────────────────────────────
    const payY = 580;
    doc.roundedRect(60, payY, 475, 100, 8).fill('#fff8ee').stroke('#c9a84c');
    doc.fillColor('#8a6000').fontSize(12).font('Helvetica-Bold')
      .text('ENROLLMENT DEPOSIT REQUIRED', 80, payY + 12, { align: 'center', width: 435 });
    doc.fillColor('#333').fontSize(10).font('Helvetica')
      .text(`To confirm your enrollment, please submit the enrollment deposit of $${offer.enrollmentDeposit} USD via bank transfer and upload proof of payment through your ScholarsGate parent dashboard.`, 80, payY + 32, { width: 435 })
      .text('This offer expires on: ' + new Date(offer.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 80, payY + 76, { width: 435 });

    // ─── Footer ───────────────────────────────────────────
    doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#0a0e1a');
    doc.fillColor('#888').fontSize(8).font('Helvetica')
      .text('ScholarsGate — Elite USA Admissions Platform | support@scholarsgate.com', 60, doc.page.height - 38, { align: 'center', width: doc.page.width - 120 });
    doc.fillColor('#c9a84c').text(`Offer Letter ${offer.offerNumber} | Generated ${new Date().toLocaleDateString()}`, 60, doc.page.height - 22, { align: 'center', width: doc.page.width - 120 });

    doc.end();
  });
};

module.exports = { generateOfferLetter };
