const express = require('express');
const { Op } = require('sequelize');
const { ParcelRequest, User } = require('../models');
const { getHandlingFee } = require('../utils/handlingFees');
const { generateUniqueReference } = require('../utils/referenceNumber');
const { validateTransition, getTimestampField } = require('../utils/statusTransitions');
const { generateQRCode } = require('../services/qrService');
const { generateReceiptPDF } = require('../services/receiptService');
const { sendRequestEmail } = require('../services/emailService');

const router = express.Router();

function findStation(req, stationId) {
  return req.app.locals.stations.find(s => s.id === stationId);
}

// POST /api/parcels - create parcel request directly (Free)
router.post('/', async (req, res) => {
  try {
    const { stationId, size } = req.body;
    if (!stationId || !size) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'stationId and size are required' } });
    }
    const station = findStation(req, stationId);
    if (!station) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Station not found' } });

    let handlingFeeCents;
    try { handlingFeeCents = getHandlingFee(size); } catch {
      return res.status(400).json({ error: { code: 'INVALID_SIZE', message: 'Invalid parcel size' } });
    }

    const referenceNumber = await generateUniqueReference(async (ref) => {
      return !!(await ParcelRequest.findOne({ where: { referenceNumber: ref } }));
    });

    const parcel = await ParcelRequest.create({
      referenceNumber,
      userId: req.user.userId,
      stationId,
      size,
      handlingFeeCents,
      status: 'AwaitingShipment',
      stripeSessionId: null,
    });

    const user = await User.findByPk(req.user.userId);
    sendRequestEmail({
      email: user?.email,
      stationEmail: station?.email,
      referenceNumber: parcel.referenceNumber,
      size,
      stationName: station?.name,
      stationAddress: station?.address,
      seafarerName: user ? `${user.firstName} ${user.lastName}` : '',
    }).catch(err => console.error('Request email error:', err.message));

    res.status(201).json({
      ...parcel.toJSON(),
      stationName: station?.name,
      stationAddress: station?.address,
      stationPhone: station?.phone,
      stationEmail: station?.email,
    });
  } catch (err) {
    console.error('Create parcel error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create parcel request. Please retry.' } });
  }
});

// GET /api/parcels/active
router.get('/active', async (req, res) => {
  try {
    const parcels = await ParcelRequest.findAll({
      where: { userId: req.user.userId, status: { [Op.ne]: 'Delivered' } },
      order: [['createdAt', 'DESC']],
    });
    const result = parcels.map(p => {
      const station = findStation(req, p.stationId);
      return { ...p.toJSON(), stationName: station?.name, stationAddress: station?.address, stationPhone: station?.phone, stationEmail: station?.email };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcels' } });
  }
});

// GET /api/parcels/delivered
router.get('/delivered', async (req, res) => {
  try {
    const parcels = await ParcelRequest.findAll({
      where: { userId: req.user.userId, status: 'Delivered' },
      order: [['deliveredAt', 'DESC']],
    });
    const result = parcels.map(p => {
      const station = findStation(req, p.stationId);
      return { ...p.toJSON(), stationName: station?.name, stationAddress: station?.address, stationPhone: station?.phone, stationEmail: station?.email };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcels' } });
  }
});

// GET /api/parcels/:id
router.get('/:id', async (req, res) => {
  try {
    const parcel = await ParcelRequest.findOne({ where: { id: req.params.id, userId: req.user.userId } });
    if (!parcel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } });
    const station = findStation(req, parcel.stationId);
    res.json({ ...parcel.toJSON(), stationName: station?.name, stationAddress: station?.address, stationPhone: station?.phone, stationEmail: station?.email });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch parcel' } });
  }
});

// PATCH /api/parcels/:id/tracking
router.patch('/:id/tracking', async (req, res) => {
  try {
    const { trackingLink, shippingFrom, estimatedArrival } = req.body;

    const parcel = await ParcelRequest.findOne({ where: { id: req.params.id, userId: req.user.userId } });
    if (!parcel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } });

    if (!validateTransition(parcel.status, 'Shipped')) {
      return res.status(409).json({ error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${parcel.status} to Shipped` } });
    }

    await parcel.update({ trackingLink: trackingLink || null, shippingFrom: shippingFrom || null, estimatedArrival: estimatedArrival || null, status: 'Shipped', shippedAt: new Date() });
    res.json(parcel.toJSON());
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update tracking' } });
  }
});

// GET /api/parcels/:id/qrcode
router.get('/:id/qrcode', async (req, res) => {
  try {
    const parcel = await ParcelRequest.findOne({ where: { id: req.params.id, userId: req.user.userId } });
    if (!parcel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } });
    if (parcel.status !== 'Arrived') {
      return res.status(400).json({ error: { code: 'NOT_ARRIVED', message: 'QR code only available for arrived parcels' } });
    }
    const qrCode = parcel.qrCodeDataUrl || await generateQRCode(parcel.referenceNumber);
    res.json({ qrCodeDataUrl: qrCode });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate QR code' } });
  }
});

// GET /api/parcels/:id/receipt
router.get('/:id/receipt', async (req, res) => {
  try {
    const parcel = await ParcelRequest.findOne({ where: { id: req.params.id, userId: req.user.userId } });
    if (!parcel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Parcel not found' } });
    if (parcel.status !== 'Delivered') {
      return res.status(400).json({ error: { code: 'NOT_DELIVERED', message: 'Receipt only available for delivered parcels' } });
    }
    const station = findStation(req, parcel.stationId);
    const pdf = await generateReceiptPDF({
      referenceNumber: parcel.referenceNumber, stationName: station?.name || parcel.stationId,
      size: parcel.size, handlingFeeCents: parcel.handlingFeeCents,
      deliveredAt: parcel.deliveredAt, signatureDataUrl: parcel.signatureDataUrl,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${parcel.referenceNumber}.pdf`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate receipt' } });
  }
});

module.exports = router;
