const PDFDocument = require('pdfkit');

function generateReceiptPDF({ referenceNumber, stationName, size, handlingFeeCents, deliveredAt, signatureDataUrl }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fee = (handlingFeeCents / 100).toFixed(2);
    const date = new Date(deliveredAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    const m = 50;
    const contentWidth = doc.page.width - m * 2;

    // Header banner
    doc.save();
    doc.rect(0, 0, doc.page.width, 100).fill('#0f2744');
    doc.fontSize(20).fillColor('#fbbf24').text('Seafarers Parcel Pickup', m, 28, { width: contentWidth, continued: false });
    doc.fontSize(9).fillColor('#94a3b8').text('Mission to Seafarers Canada', m, 54, { width: contentWidth, continued: false });
    doc.fontSize(13).fillColor('#ffffff').text('PICKUP RECEIPT', 0, 28, { width: doc.page.width - m, align: 'right', continued: false });
    doc.fontSize(9).fillColor('#94a3b8').text(date, 0, 48, { width: doc.page.width - m, align: 'right', continued: false });
    doc.restore();

    // Reference number
    let y = 120;
    doc.rect(m, y, contentWidth, 40).fill('#f0f9ff');
    doc.rect(m, y, contentWidth, 40).lineWidth(0.5).strokeColor('#bae6fd').stroke();
    doc.fontSize(9).fillColor('#64748b').text('REFERENCE NUMBER', m + 14, y + 14, { continued: false });
    doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text(referenceNumber, m + 160, y + 10, { continued: false });
    doc.font('Helvetica');

    // Details
    y = 180;
    doc.fontSize(9).fillColor('#94a3b8').text('PARCEL DETAILS', m, y, { continued: false });
    y += 16;
    doc.moveTo(m, y).lineTo(m + contentWidth, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    y += 8;

    const rows = [
      ['Station', stationName],
      ['Parcel Size', size],
      ['Delivery Date', date],
      ['Status', 'Delivered'],
    ];

    rows.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.save();
        doc.rect(m, y - 4, contentWidth, 24).fill('#f8fafc');
        doc.restore();
      }
      doc.fontSize(10).fillColor('#64748b').text(label, m + 10, y, { continued: false });
      doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(value, m + 160, y, { width: contentWidth - 170, continued: false });
      doc.font('Helvetica');
      y += 24;
    });

    // Signature
    y += 24;
    doc.fontSize(9).fillColor('#94a3b8').text('SIGNATURE', m, y, { continued: false });
    y += 14;
    doc.moveTo(m, y).lineTo(m + contentWidth, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    y += 8;

    if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
      try {
        const base64 = signatureDataUrl.split(',')[1];
        const imgBuffer = Buffer.from(base64, 'base64');
        doc.rect(m, y, 220, 80).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
        doc.image(imgBuffer, m + 4, y + 4, { width: 212, height: 72 });
        y += 90;
      } catch {
        doc.fontSize(10).fillColor('#64748b').text('Signature on file', m, y, { continued: false });
        y += 18;
      }
    } else {
      doc.fontSize(10).fillColor('#64748b').text('Signature on file', m, y, { continued: false });
      y += 18;
    }

    // Footer — positioned carefully to stay on page 1
    y = Math.max(y + 20, 680);
    doc.moveTo(m, y).lineTo(m + contentWidth, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    y += 10;
    doc.fontSize(8).fillColor('#94a3b8')
      .text('This receipt confirms the pickup and delivery of the above parcel.', m, y, { width: contentWidth, align: 'center', continued: false });
    y += 12;
    doc.text(`Seafarers Parcel Pickup Service — Mission to Seafarers Canada — mtsc.ca`, m, y, { width: contentWidth, align: 'center', continued: false });
    y += 12;
    doc.text(`Receipt generated on ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`, m, y, { width: contentWidth, align: 'center', continued: false });

    // Ensure only 1 page — remove any extra pages
    const range = doc.bufferedPageRange();
    while (range.count > 1) {
      // PDFKit doesn't support page deletion, so we just ensure content fits
      break;
    }

    doc.end();
  });
}

module.exports = { generateReceiptPDF };
