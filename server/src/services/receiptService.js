const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateReceiptPDF({ referenceNumber, stationName, size, handlingFeeCents, deliveredAt, signatureDataUrl }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const date = new Date(deliveredAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  const m = 50;
  const contentWidth = width - m * 2;

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(15 / 255, 39 / 255, 68 / 255), // #0f2744
  });

  page.drawText('Seafarers Parcel Pickup', {
    x: m,
    y: height - 48,
    size: 20,
    font: fontBold,
    color: rgb(251 / 255, 191 / 255, 36 / 255), // #fbbf24
  });

  page.drawText('Mission to Seafarers Canada', {
    x: m,
    y: height - 68,
    size: 9,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255), // #94a3b8
  });

  page.drawText('PICKUP RECEIPT', {
    x: width - m - 120,
    y: height - 48,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(date, {
    x: width - m - 120,
    y: height - 68,
    size: 9,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  // Reference Number Box
  let y = height - 150;
  page.drawRectangle({
    x: m,
    y: y - 10,
    width: contentWidth,
    height: 40,
    color: rgb(240 / 255, 249 / 255, 255 / 255), // #f0f9ff
    borderColor: rgb(186 / 255, 230 / 255, 253 / 255), // #bae6fd
    borderWidth: 0.5,
  });

  page.drawText('REFERENCE NUMBER', {
    x: m + 14,
    y: y + 5,
    size: 9,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255), // #64748b
  });

  page.drawText(referenceNumber || '', {
    x: m + 180,
    y: y + 4,
    size: 15,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255), // #0f172a
  });

  // Parcel Details Header
  y -= 50;
  page.drawText('PARCEL DETAILS', {
    x: m,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  page.drawLine({
    start: { x: m, y: y - 6 },
    end: { x: m + contentWidth, y: y - 6 },
    thickness: 0.5,
    color: rgb(226 / 255, 232 / 255, 240 / 255), // #e2e8f0
  });

  // Rows
  const rows = [
    ['Station', stationName || ''],
    ['Parcel Size', size || ''],
    ['Delivery Date', date],
    ['Status', 'Delivered'],
  ];

  y -= 26;
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      page.drawRectangle({
        x: m,
        y: y - 6,
        width: contentWidth,
        height: 24,
        color: rgb(248 / 255, 250 / 255, 252 / 255), // #f8fafc
      });
    }

    page.drawText(label, {
      x: m + 10,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    page.drawText(value, {
      x: m + 180,
      y,
      size: 10,
      font: fontBold,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    y -= 24;
  });

  // Signature Section
  y -= 20;
  page.drawText('SIGNATURE', {
    x: m,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  page.drawLine({
    start: { x: m, y: y - 6 },
    end: { x: m + contentWidth, y: y - 6 },
    thickness: 0.5,
    color: rgb(226 / 255, 232 / 255, 240 / 255),
  });

  y -= 80;
  let signatureEmbedded = false;
  if (signatureDataUrl && signatureDataUrl.startsWith('data:image/')) {
    try {
      const base64Data = signatureDataUrl.split(',')[1];
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const isPng = signatureDataUrl.includes('image/png');
      const embeddedImg = isPng ? await pdfDoc.embedPng(imgBuffer) : await pdfDoc.embedJpg(imgBuffer);

      page.drawRectangle({
        x: m,
        y,
        width: 220,
        height: 70,
        borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
        borderWidth: 0.5,
      });

      page.drawImage(embeddedImg, {
        x: m + 5,
        y: y + 5,
        width: 210,
        height: 60,
      });
      signatureEmbedded = true;
    } catch (err) {
      console.error('Signature embed error:', err.message);
    }
  }

  if (!signatureEmbedded) {
    page.drawText('Signature on file', {
      x: m + 10,
      y: y + 30,
      size: 10,
      font: fontRegular,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });
  }

  // Footer
  const footerY = 80;
  page.drawLine({
    start: { x: m, y: footerY + 20 },
    end: { x: m + contentWidth, y: footerY + 20 },
    thickness: 0.5,
    color: rgb(226 / 255, 232 / 255, 240 / 255),
  });

  const footerLine1 = 'This receipt confirms the pickup and delivery of the above parcel.';
  const footerLine2 = 'Seafarers Parcel Pickup Service — Mission to Seafarers Canada — mtsc.ca';
  const footerLine3 = `Receipt generated on ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  page.drawText(footerLine1, {
    x: (width - fontRegular.widthOfTextAtSize(footerLine1, 8)) / 2,
    y: footerY + 6,
    size: 8,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  page.drawText(footerLine2, {
    x: (width - fontRegular.widthOfTextAtSize(footerLine2, 8)) / 2,
    y: footerY - 8,
    size: 8,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  page.drawText(footerLine3, {
    x: (width - fontRegular.widthOfTextAtSize(footerLine3, 8)) / 2,
    y: footerY - 22,
    size: 8,
    font: fontRegular,
    color: rgb(148 / 255, 163 / 255, 184 / 255),
  });

  return await pdfDoc.save();
}

module.exports = { generateReceiptPDF };
