const { Hono } = require('hono');
const { eq, and, gte, lt } = require('drizzle-orm');
const { getDb, parcelRequests, stations } = require('../db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const reportsRouter = new Hono();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Helper to query monthly parcels
async function getMonthlyParcels(db, stationId, month, year) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 1).toISOString();

  const parcels = await db.select().from(parcelRequests).where(
    and(
      eq(parcelRequests.stationId, stationId),
      eq(parcelRequests.status, 'Delivered'),
      gte(parcelRequests.deliveredAt, startDate),
      lt(parcelRequests.deliveredAt, endDate)
    )
  );

  const breakdown = {
    Small: { count: 0, fees: 0 },
    Medium: { count: 0, fees: 0 },
    Large: { count: 0, fees: 0 },
    'Extra Large': { count: 0, fees: 0 },
  };

  let totalCount = 0;
  let totalFees = 0;

  for (const p of parcels) {
    if (breakdown[p.size]) {
      breakdown[p.size].count++;
      breakdown[p.size].fees += p.handlingFeeCents;
    }
    totalCount++;
    totalFees += p.handlingFeeCents;
  }

  return { parcels, breakdown, totalCount, totalFees };
}

// GET /api/station/reports?month=1&year=2025
reportsRouter.get('/', async (c) => {
  try {
    const staff = c.get('user');
    const now = new Date();
    const month = parseInt(c.req.query('month'), 10) || (now.getMonth() + 1);
    const year = parseInt(c.req.query('year'), 10) || now.getFullYear();

    const db = getDb(c.env);
    const { breakdown, totalCount, totalFees } = await getMonthlyParcels(db, staff.stationId, month, year);

    return c.json({ month, year, totalCount, totalFees, breakdown });
  } catch (err) {
    console.error('Report error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate report' } }, 500);
  }
});

// GET /api/station/reports/pdf?month=1&year=2025
reportsRouter.get('/pdf', async (c) => {
  try {
    const staff = c.get('user');
    const now = new Date();
    const month = parseInt(c.req.query('month'), 10) || (now.getMonth() + 1);
    const year = parseInt(c.req.query('year'), 10) || now.getFullYear();

    const db = getDb(c.env);
    const { breakdown, totalCount } = await getMonthlyParcels(db, staff.stationId, month, year);

    const [station] = await db.select().from(stations).where(eq(stations.id, staff.stationId)).limit(1);
    const stationName = station?.name || staff.stationId;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const m = 50;
    const contentWidth = width - m * 2;

    // Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 90,
      width,
      height: 90,
      color: rgb(15 / 255, 39 / 255, 68 / 255), // #0f2744
    });

    page.drawText('Parcel Report', {
      x: m,
      y: height - 42,
      size: 18,
      font: fontBold,
      color: rgb(251 / 255, 191 / 255, 36 / 255), // #fbbf24
    });

    page.drawText('Seafarers Parcel Pickup Service', {
      x: m,
      y: height - 60,
      size: 9,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    const dateHeader = `${MONTHS[month - 1]} ${year}`;
    page.drawText(dateHeader, {
      x: width - m - 120,
      y: height - 42,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(stationName, {
      x: width - m - 120,
      y: height - 60,
      size: 9,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    // Summary Section
    let y = height - 130;
    page.drawText('SUMMARY', {
      x: m,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    page.drawLine({
      start: { x: m, y: y - 8 },
      end: { x: m + contentWidth, y: y - 8 },
      thickness: 0.5,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    y -= 60;
    page.drawRectangle({
      x: m,
      y,
      width: contentWidth,
      height: 50,
      color: rgb(240 / 255, 249 / 255, 255 / 255), // #f0f9ff
    });

    page.drawText(String(totalCount), {
      x: m + 14,
      y: y + 22,
      size: 22,
      font: fontBold,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    page.drawText('Total Parcels', {
      x: m + 14,
      y: y + 8,
      size: 9,
      font: fontRegular,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    // Breakdown By Size Section
    y -= 45;
    page.drawText('BREAKDOWN BY SIZE', {
      x: m,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    page.drawLine({
      start: { x: m, y: y - 8 },
      end: { x: m + contentWidth, y: y - 8 },
      thickness: 0.5,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    // Table Header
    y -= 25;
    page.drawText('SIZE', {
      x: m + 10,
      y,
      size: 9,
      font: fontBold,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    page.drawText('PARCELS', {
      x: m + 200,
      y,
      size: 9,
      font: fontBold,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    const sizes = ['Small', 'Medium', 'Large', 'Extra Large'];
    y -= 22;

    sizes.forEach((sizeName, i) => {
      if (i % 2 === 0) {
        page.drawRectangle({
          x: m,
          y: y - 5,
          width: contentWidth,
          height: 22,
          color: rgb(248 / 255, 250 / 255, 252 / 255),
        });
      }

      page.drawText(sizeName, {
        x: m + 10,
        y,
        size: 11,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });

      page.drawText(String(breakdown[sizeName]?.count || 0), {
        x: m + 200,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(71 / 255, 85 / 255, 105 / 255),
      });

      y -= 24;
    });

    // Total Row
    y -= 6;
    page.drawRectangle({
      x: m,
      y: y - 6,
      width: contentWidth,
      height: 28,
      color: rgb(255 / 255, 251 / 255, 235 / 255), // #fffbeb
      borderColor: rgb(253 / 255, 230 / 255, 138 / 255), // #fde68a
      borderWidth: 0.5,
    });

    page.drawText('TOTAL', {
      x: m + 10,
      y: y + 2,
      size: 11,
      font: fontBold,
      color: rgb(146 / 255, 64 / 255, 14 / 255), // #92400e
    });

    page.drawText(String(totalCount), {
      x: m + 200,
      y: y + 2,
      size: 11,
      font: fontBold,
      color: rgb(146 / 255, 64 / 255, 14 / 255),
    });

    // Footer
    const footerY = 80;
    page.drawLine({
      start: { x: m, y: footerY + 20 },
      end: { x: m + contentWidth, y: footerY + 20 },
      thickness: 0.5,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    const footer1 = `Generated on ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    const footer2 = 'Seafarers Parcel Pickup Service — Mission to Seafarers Canada — mtsc.ca';

    page.drawText(footer1, {
      x: (width - fontRegular.widthOfTextAtSize(footer1, 8)) / 2,
      y: footerY + 5,
      size: 8,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    page.drawText(footer2, {
      x: (width - fontRegular.widthOfTextAtSize(footer2, 8)) / 2,
      y: footerY - 10,
      size: 8,
      font: fontRegular,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=report-${MONTHS[month - 1]}-${year}.pdf`,
      },
    });
  } catch (err) {
    console.error('Report PDF error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate report PDF' } }, 500);
  }
});

module.exports = reportsRouter;
