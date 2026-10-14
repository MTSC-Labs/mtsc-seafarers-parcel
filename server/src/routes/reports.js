const { Hono } = require('hono');
const { eq, and, gte, lt } = require('drizzle-orm');
const { getDb, parcelRequests, stations } = require('../db');
const PDFDocument = require('pdfkit');

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

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const m = 50;
      const cw = doc.page.width - m * 2;

      // Header
      doc.rect(0, 0, doc.page.width, 90).fill('#0f2744');
      doc.fontSize(18).fillColor('#fbbf24').text('Parcel Report', m, 24, { continued: false });
      doc.fontSize(9).fillColor('#94a3b8').text('Seafarers Parcel Pickup Service', m, 48, { continued: false });
      doc.fontSize(12).fillColor('#ffffff').text(`${MONTHS[month - 1]} ${year}`, 0, 28, { width: doc.page.width - m, align: 'right', continued: false });
      doc.fontSize(9).fillColor('#94a3b8').text(stationName, 0, 48, { width: doc.page.width - m, align: 'right', continued: false });

      // Summary
      let y = 110;
      doc.fontSize(10).fillColor('#94a3b8').text('SUMMARY', m, y, { continued: false });
      y += 18;
      doc.moveTo(m, y).lineTo(m + cw, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      y += 10;

      doc.save(); doc.rect(m, y, cw, 50).fill('#f0f9ff'); doc.restore();
      doc.fontSize(22).fillColor('#0f172a').font('Helvetica-Bold').text(String(totalCount), m + 14, y + 8, { continued: false });
      doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Total Parcels', m + 14, y + 34, { continued: false });

      // Breakdown table
      y += 70;
      doc.fontSize(10).fillColor('#94a3b8').text('BREAKDOWN BY SIZE', m, y, { continued: false });
      y += 18;
      doc.moveTo(m, y).lineTo(m + cw, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      y += 10;

      // Table header
      doc.fontSize(9).fillColor('#94a3b8').font('Helvetica-Bold');
      doc.text('SIZE', m + 10, y, { continued: false });
      doc.text('PARCELS', m + 200, y, { continued: false });
      doc.font('Helvetica');
      y += 20;

      ['Small', 'Medium', 'Large', 'Extra Large'].forEach((size, i) => {
        if (i % 2 === 0) { doc.save(); doc.rect(m, y - 4, cw, 24).fill('#f8fafc'); doc.restore(); }
        doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text(size, m + 10, y, { continued: false });
        doc.font('Helvetica').fillColor('#475569').text(String(breakdown[size].count), m + 200, y, { continued: false });
        doc.font('Helvetica');
        y += 24;
      });

      // Total row
      y += 6;
      doc.rect(m, y, cw, 30).fill('#fffbeb');
      doc.rect(m, y, cw, 30).lineWidth(0.5).strokeColor('#fde68a').stroke();
      doc.fontSize(11).fillColor('#92400e').font('Helvetica-Bold').text('TOTAL', m + 10, y + 8, { continued: false });
      doc.text(String(totalCount), m + 200, y + 8, { continued: false });
      doc.font('Helvetica');

      // Footer
      y = 680;
      doc.moveTo(m, y).lineTo(m + cw, y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      y += 10;
      doc.fontSize(8).fillColor('#94a3b8').text(`Generated on ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`, m, y, { width: cw, align: 'center', continued: false });
      y += 12;
      doc.text('Seafarers Parcel Pickup Service — Mission to Seafarers Canada — mtsc.ca', m, y, { width: cw, align: 'center', continued: false });

      doc.end();
    });

    return new Response(pdfBuffer, {
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
