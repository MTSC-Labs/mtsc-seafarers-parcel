const { Hono } = require('hono');
const { eq, and, inArray, desc, asc } = require('drizzle-orm');
const { getDb, parcelRequests, users, stations } = require('../db');
const { validateTransition } = require('../utils/statusTransitions');
const { generateQRCode } = require('../services/qrService');
const { generateReceiptPDF } = require('../services/receiptService');
const { sendArrivalEmail, sendDeliveryEmail } = require('../services/emailService');

const stationParcelsRouter = new Hono();

// Helper to attach seafarer/user details to parcel items
async function enrichParcelsWithUser(db, parcels) {
  if (!parcels || parcels.length === 0) return [];
  const userIds = [...new Set(parcels.map(p => p.userId))];
  const userMap = {};
  if (userIds.length > 0) {
    const userRecords = await db.select().from(users).where(inArray(users.id, userIds));
    userRecords.forEach(u => { userMap[u.id] = u; });
  }

  return parcels.map(p => {
    const u = userMap[p.userId];
    return {
      ...p,
      seafarerEmail: u?.email || null,
      seafarerName: u ? `${u.firstName} ${u.lastName}` : '',
      seafarerPhone: u?.phone || null,
    };
  });
}

// GET /api/station/parcels/incoming
stationParcelsRouter.get('/incoming', async (c) => {
  try {
    const staff = c.get('user');
    const { search } = c.req.query();
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.stationId, staff.stationId),
        inArray(parcelRequests.status, ['AwaitingShipment', 'Shipped'])
      ))
      .orderBy(asc(parcelRequests.estimatedArrival), desc(parcelRequests.createdAt));

    let result = await enrichParcelsWithUser(db, parcels);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.seafarerName?.toLowerCase().includes(q) ||
        p.seafarerEmail?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q) ||
        p.shippingFrom?.toLowerCase().includes(q)
      );
    }

    return c.json(result);
  } catch (err) {
    console.error('Incoming parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch incoming parcels' } }, 500);
  }
});

// GET /api/station/parcels/pending-pickup
stationParcelsRouter.get('/pending-pickup', async (c) => {
  try {
    const staff = c.get('user');
    const { search } = c.req.query();
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.stationId, staff.stationId),
        eq(parcelRequests.status, 'Arrived')
      ))
      .orderBy(desc(parcelRequests.arrivedAt));

    let result = await enrichParcelsWithUser(db, parcels);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.seafarerName?.toLowerCase().includes(q) ||
        p.seafarerEmail?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q)
      );
    }

    return c.json(result);
  } catch (err) {
    console.error('Pending pickup parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch pending pickup parcels' } }, 500);
  }
});

// GET /api/station/parcels/delivered
stationParcelsRouter.get('/delivered', async (c) => {
  try {
    const staff = c.get('user');
    const { search } = c.req.query();
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.stationId, staff.stationId),
        eq(parcelRequests.status, 'Delivered')
      ))
      .orderBy(desc(parcelRequests.deliveredAt));

    let result = await enrichParcelsWithUser(db, parcels);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.seafarerName?.toLowerCase().includes(q) ||
        p.seafarerEmail?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q)
      );
    }

    return c.json(result);
  } catch (err) {
    console.error('Delivered parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch delivered parcels' } }, 500);
  }
});

// GET /api/station/parcels/completed (alias - frontend CompletedPage uses this)
stationParcelsRouter.get('/completed', async (c) => {
  try {
    const staff = c.get('user');
    const { search } = c.req.query();
    const db = getDb(c.env);

    const parcels = await db.select().from(parcelRequests)
      .where(and(
        eq(parcelRequests.stationId, staff.stationId),
        eq(parcelRequests.status, 'Delivered')
      ))
      .orderBy(desc(parcelRequests.deliveredAt));

    let result = await enrichParcelsWithUser(db, parcels);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.seafarerName?.toLowerCase().includes(q) ||
        p.seafarerEmail?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q) ||
        p.shippingFrom?.toLowerCase().includes(q)
      );
    }

    return c.json(result);
  } catch (err) {
    console.error('Completed parcels error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch completed parcels' } }, 500);
  }
});

// GET /api/station/parcels/lookup/:ref
stationParcelsRouter.get('/lookup/:ref', async (c) => {
  try {
    const staff = c.get('user');
    const ref = c.req.param('ref');
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(
        eq(parcelRequests.referenceNumber, ref),
        eq(parcelRequests.stationId, staff.stationId)
      )
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active parcel found for this reference number' } }, 404);
    }

    const [user] = await db.select().from(users).where(eq(users.id, parcel.userId)).limit(1);

    return c.json({
      ...parcel,
      seafarerEmail: user?.email || null,
      seafarerName: user ? `${user.firstName} ${user.lastName}` : '',
      seafarerPhone: user?.phone || null,
    });
  } catch (err) {
    console.error('Lookup parcel error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Lookup failed' } }, 500);
  }
});

// PATCH /api/station/parcels/:id/arrived
stationParcelsRouter.patch('/:id/arrived', async (c) => {
  try {
    const staff = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.stationId, staff.stationId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    if (!validateTransition(parcel.status, 'Arrived')) {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${parcel.status} to Arrived` } }, 409);
    }

    const qrCode = await generateQRCode(parcel.referenceNumber);
    const now = new Date().toISOString();

    const [updated] = await db.update(parcelRequests).set({
      status: 'Arrived',
      arrivedAt: now,
      qrCodeDataUrl: qrCode,
      updatedAt: now,
    }).where(eq(parcelRequests.id, id)).returning();

    const [user] = await db.select().from(users).where(eq(users.id, parcel.userId)).limit(1);
    const [station] = await db.select().from(stations).where(eq(stations.id, parcel.stationId)).limit(1);

    sendArrivalEmail({
      email: user?.email,
      referenceNumber: parcel.referenceNumber,
      stationName: station?.name || parcel.stationId,
      stationAddress: station?.address || '',
      qrCodeDataUrl: qrCode,
      seafarerName: user ? `${user.firstName} ${user.lastName}` : '',
    }).catch(err => console.error('Arrival email error:', err.message));

    return c.json(updated);
  } catch (err) {
    console.error('Arrive parcel error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to mark parcel as arrived' } }, 500);
  }
});

// POST /api/station/parcels/:id/deliver
stationParcelsRouter.post('/:id/deliver', async (c) => {
  try {
    const staff = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const { signatureDataUrl } = await c.req.json();

    if (!signatureDataUrl) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'signatureDataUrl is required' } }, 400);
    }

    const db = getDb(c.env);
    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.stationId, staff.stationId))
    ).limit(1);

    if (!parcel) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    if (!validateTransition(parcel.status, 'Delivered')) {
      return c.json({ error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${parcel.status} to Delivered` } }, 409);
    }

    let storedSignature = signatureDataUrl;

    // If Cloudflare R2 bucket binding is configured, upload the signature to R2
    const bucket = c.env?.BUCKET || c.env?.mtsc_parcel_uploads;
    if (bucket && signatureDataUrl.startsWith('data:image/')) {
      try {
        const base64Data = signatureDataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `signatures/sig-${parcel.referenceNumber}-${Date.now()}.png`;
        await bucket.put(filename, buffer, {
          httpMetadata: { contentType: 'image/png' },
        });
        storedSignature = `/uploads/${filename}`;
      } catch (r2Err) {
        console.error('R2 upload warning, falling back to base64:', r2Err.message);
      }
    }

    const now = new Date().toISOString();
    const [updated] = await db.update(parcelRequests).set({
      status: 'Delivered',
      deliveredAt: now,
      signatureDataUrl: storedSignature,
      updatedAt: now,
    }).where(eq(parcelRequests.id, id)).returning();

    const [user] = await db.select().from(users).where(eq(users.id, parcel.userId)).limit(1);
    const [station] = await db.select().from(stations).where(eq(stations.id, parcel.stationId)).limit(1);

    sendDeliveryEmail({
      email: user?.email,
      referenceNumber: parcel.referenceNumber,
      stationName: station?.name || parcel.stationId,
      deliveredAt: now,
      seafarerName: user ? `${user.firstName} ${user.lastName}` : '',
    }).catch(err => console.error('Delivery email error:', err.message));

    return c.json(updated);
  } catch (err) {
    console.error('Deliver parcel error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to deliver parcel' } }, 500);
  }
});

// GET /api/station/parcels/:id/receipt
stationParcelsRouter.get('/:id/receipt', async (c) => {
  try {
    const staff = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const db = getDb(c.env);

    const [parcel] = await db.select().from(parcelRequests).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.stationId, staff.stationId))
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

// PATCH /api/station/parcels/:id/notes
stationParcelsRouter.patch('/:id/notes', async (c) => {
  try {
    const staff = c.get('user');
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const internalNotes = body.notes !== undefined ? body.notes : body.internalNotes;
    const db = getDb(c.env);

    const [updated] = await db.update(parcelRequests).set({
      internalNotes: internalNotes || null,
      updatedAt: new Date().toISOString(),
    }).where(
      and(eq(parcelRequests.id, id), eq(parcelRequests.stationId, staff.stationId))
    ).returning();

    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } }, 404);
    }

    return c.json(updated);
  } catch (err) {
    console.error('Update notes error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to update notes' } }, 500);
  }
});

module.exports = stationParcelsRouter;

