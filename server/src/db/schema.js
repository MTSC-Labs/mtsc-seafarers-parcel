const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const users = sqliteTable('Users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  phone: text('phone'),
  passwordHash: text('passwordHash').notNull(),
  resetOtp: text('resetOtp'),
  resetOtpExpiry: text('resetOtpExpiry'),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

const stations = sqliteTable('Stations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  email: text('email'),
  staffUsername: text('staffUsername').notNull().unique(),
  staffPasswordHash: text('staffPasswordHash').notNull(),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

const admins = sqliteTable('Admins', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

const preferredStations = sqliteTable('PreferredStations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  stationId: text('stationId').notNull(),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
});

const parcelRequests = sqliteTable('ParcelRequests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referenceNumber: text('referenceNumber').notNull().unique(),
  userId: integer('userId').notNull().references(() => users.id),
  stationId: text('stationId').notNull(),
  size: text('size').notNull(),
  handlingFeeCents: integer('handlingFeeCents').notNull().default(0),
  status: text('status').notNull().default('AwaitingShipment'),
  trackingLink: text('trackingLink'),
  shippingFrom: text('shippingFrom'),
  estimatedArrival: text('estimatedArrival'),
  stripeSessionId: text('stripeSessionId'),
  qrCodeDataUrl: text('qrCodeDataUrl'),
  signatureDataUrl: text('signatureDataUrl'),
  shippedAt: text('shippedAt'),
  arrivedAt: text('arrivedAt'),
  deliveredAt: text('deliveredAt'),
  internalNotes: text('internalNotes'),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

module.exports = {
  users,
  stations,
  admins,
  preferredStations,
  parcelRequests,
};
