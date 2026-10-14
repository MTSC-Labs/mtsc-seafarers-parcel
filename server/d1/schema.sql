-- D1 Database Schema for Seafarers Parcel Pickup Service

CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phone TEXT,
  passwordHash TEXT NOT NULL,
  resetOtp TEXT,
  resetOtpExpiry TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  staffUsername TEXT NOT NULL UNIQUE,
  staffPasswordHash TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS PreferredStations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES Users(id),
  stationId TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  UNIQUE(userId, stationId)
);

CREATE TABLE IF NOT EXISTS ParcelRequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referenceNumber TEXT NOT NULL UNIQUE,
  userId INTEGER NOT NULL REFERENCES Users(id),
  stationId TEXT NOT NULL,
  size TEXT NOT NULL,
  handlingFeeCents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'AwaitingShipment',
  trackingLink TEXT,
  shippingFrom TEXT,
  estimatedArrival TEXT,
  stripeSessionId TEXT,
  qrCodeDataUrl TEXT,
  signatureDataUrl TEXT,
  shippedAt TEXT,
  arrivedAt TEXT,
  deliveredAt TEXT,
  internalNotes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Seed Initial Super Admin
INSERT OR IGNORE INTO Admins (id, username, passwordHash)
VALUES ('admin-root', 'admin', '$2a$10$wY9AjBzwd12GPONGZopmwe2FxZ9.v9dyEzfL534k0uusgCYHlazYC');

-- Seed Stations
INSERT OR REPLACE INTO Stations (id, name, address, phone, email, staffUsername, staffPasswordHash)
VALUES 
  ('halifax-port', 'Halifax', '844 Marginal Rd, Halifax, NS B3H 4M8', '+1 (902) 555-0202', 'jloot@missiontoseafarershalifax.ca,hglenn@missiontoseafarershalifax.ca', 'halifax-staff', '$2a$10$0KfWjMhpKoxdk/XC9SZ11uplZ9/4r9agv5D.38X18brFD8HgZttqS'),
  ('hamilton-port', 'Hamilton', '651 Burlington St E, Hamilton, ON L8L 4J5', '+1 (905) 555-0303', 'dan.phannenhour@gmail.com,manager@mtsso.org', 'hamilton-staff', '$2a$10$8/1IYWgyf3AQzwKOMd0ZzuOKyOHXScTMNh5qz0fY301rqz4HJh4YC'),
  ('newfoundland-port', 'Newfoundland and Labrador', '687 Water Street, 2nd Floor, St. John''s, NL A1E 1B5', '+1 (709) 555-0404', 'morganesheppard@gmail.com,morganesheppard@missiontoseafarersnl.ca', 'newfoundland-staff', '$2a$10$FLJ29NXoe1cuj83BqB1QiudN4b.10KgD8Ms3/gJImRiJ4PMnd7piG'),
  ('toronto-port', 'Toronto', 'c/o Judith Alltree, 85 Henry Lane Terrace, Unit 417, Toronto, ON. M5A 4B8', '+1 (416) 555-0505', 'glutenfreepriest@gmail.com', 'toronto-staff', '$2a$10$8qesWcQWJ2825wGHovkdi.i/mPM7Fb.rHMzmti.xgznaDODsEgCBu');
