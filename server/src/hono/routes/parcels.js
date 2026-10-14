const { Hono } = require('hono');
const { eq, and, ne, desc } = require('drizzle-orm');
const { getDb, parcelRequests, stations, users } = require('../../db');
const { getHandlingFee } = require('../../utils/handlingFees');
const { generateUniqueReference } = require('../../utils/referenceNumber');
const { validateTransition } = require('../../utils/statusTransitions');
const { generateQRCode } = require('../../services/qrService');
const { generateReceiptPDF } = require('../../services/receiptService');
const { sendRequestEmail } = require('../../services/emailService');

const parcelsRouter = new Hono();

// Helper to attach station details to a parcel
async function attachStation(db, parcel) {
  if (!parcel) return null;
  const [station] = await db.select().from(stations).where(eq(stations.id, parcel.stationId)).limit(1);
  return {
    ...parcel,
    stationName: station?.name || null,
    stationAddress: station?.address || null,
    stationPhone: station?.phone || null,
    stationEmail: station?.email || null,
  };
}

// POST /api/parcels
parcelsRouter.post('/', async (c) => {
  try {
    const userPayload = c.get('user');
    const { stationId, size } = await c.req.json();
    if (!stationId || !size) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'stationId and size are required' } }, 400);
    }

    const db = getDb(c.env);
    const [station] = await db.select().from(stations).where(eq(stations.id, stationId)).limit(1);
    if (!station) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Station not found' } }, 404);
    }

    let handlingFeeCents;
    try {
      handlingFeeCents = getHandlingFee(size);
    } catch {
      return c.json({ error: { code: 'INVALID_SIZE', message: 'Invalid parcel size' } }, 400);
    }

    const referenceNumber = await generateUniqueReference(async (ref) => {
      const [existing] = await db.select().from(parcelRequests).where(eq(parcelRequests.referenceNumber, ref)).limit(1);
      return !!existing;
    });

    const [parcel] = await db.insert(parcelRequests).values({
      referenceNumber,
      userId: userPayload.userId,
      stationId,
      size,
      handlingFeeCents,
      status: 'AwaitingShipment',
      stripeSessionId: null,
    }).returning();

    const [user] = await db.select().from(users).where(eq(users.id, userPayload.userId)).limit(1);

    sendRequestEmail({
      email: user?.email,
      stationEmail: station?.email,
      referenceNumber: parcel.referenceNumber,
      size,
      stationName: station?.name,
      stationAddress: station?.address,
      seafarerName: user ? `${user.firstName} ${user.lastName}` : '',
    }).catch(err => console.error('Request email error:', err.message));

    return c.json({
      ...parcel,
      stationName: station.name,
      stationAddress: station.address,
      stationPhone: station.phone,
      stationEmail: station.email,
    }, 201);
  } catch (err) {
    console.error('Create parcel error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to create parcel request. Please retry.' } }, 500);
  }
});

// GET /api/parcels/active
parcelsRouter.get('/active', async (c) => {
  try {
    const userPayload = c.get('user');
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.userId, userPayload.userId),
        ne(parcelRequests.status, 'Delivered')
      ))
      .orderBy(desc(parcelRequests.createdAt));

    const result = await Promise.all(parcels.map(p => attachStation(db, p)));
    return c.json(result);
  } catch (err) {
    console.error('Fetch active parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcels' } }, 500);
  }
});

// GET /api/parcels/delivered
parcelsRouter.get('/delivered', async (c) => {
  try {
    const userPayload = c.get('user');
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.userId, userPayload.userId),
        eq(parcelRequests.status, 'Delivered')
      ))
      .orderBy(desc(parcelRequests.deliveredAt));

    const result = await Promise.all(parcels.map(p => attachStation(db, p)));
    return c.json(result);
  } catch (err) {
    console.error('Fetch delivered parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcels' } }, 500);
  }
});

// GET /api/parcels/:id
parcelsRouter.get('/:id', async (c) => {
  try {
    const userPayload = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.userId, userPayload.userId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    const result = await attachStation(db, parcel);
    return c.json(result);
  } catch (err) {
    console.error('Fetch parcel error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcel' } }, 500);
  }
});

// PATCH /api/parcels/:id/tracking
parcelsRouter.patch('/:id/tracking', async (c) => {
  try {
    const userPayload = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const { trackingLink, shippingFrom, estimatedArrival } = await c.req.json();
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.userId, userPayload.userId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    if (!validateTransition(parcel.status, 'Shipped')) {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${parcel.status} to Shipped` } }, 409);
    }

    const [updated] = await db.update(parcelRequests).set({
      trackingLink: trackingLink || null,
      shippingFrom: shippingFrom || null,
      estimatedArrival: estimatedArrival || null,
      status: 'Shipped',
      shippedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(parcelRequests.id, id)).returning();

    return c.json(updated);
  } catch (err) {
    console.error('Update tracking error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to update tracking' } }, 500);
  }
});

// GET /api/parcels/:id/qrcode
parcelsRouter.get('/:id/qrcode', async (c) => {
  try {
    const userPayload = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.userId, userPayload.userId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    if (parcel.status !== 'Arrived') {
      return c.json({ error: { code: 'NOT_ARRIVED', message: 'QR code only available for arrived parcels' } }, 400);
    }

    const qrCode = parcel.qrCodeDataUrl || await generateQRCode(parcel.referenceNumber);
    return c.json({ qrCodeDataUrl: qrCode });
  } catch (err) {
    console.error('QR code error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate QR code' } }, 500);
  }
});

// GET /api/parcels/:id/receipt
parcelsRouter.get('/:id/receipt', async (c) => {
  try {
    const userPayload = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.userId, userPayload.userId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    if (parcel.status !== 'Delivered') {
      return c.json({ error: { code: 'NOT_DELIVERED', message: 'Receipt only available for delivered parcels' } }, 400);
    }

    const [station] = await db.select().from(stations).where(eq(stations.id, parcel.stationId)).limit(1);
    const pdfBuffer = await generateReceiptPDF({
      referenceNumber: parcel.referenceNumber,
      stationName: station?.name || parcel.stationId,
      size: parcel.size,
      handlingFeeCents: parcel.handlingFeeCents,
      deliveredAt: parcel.deliveredAt,
      signatureDataUrl: parcel.signatureDataUrl,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=receipt-${parcel.referenceNumber}.pdf`,
      },
    });
  } catch (err) {
    console.error('Receipt error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate receipt' } }, 500);
  }
});

module.exports = parcelsRouter;
