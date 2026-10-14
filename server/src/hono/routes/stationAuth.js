const { Hono } = require('hono');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { getDb, stations, admins } = require('../../db');

const stationAuthRouter = new Hono();

// POST /api/auth/station/login
stationAuthRouter.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'Username and password are required' } }, 400);
    }

    const db = getDb(c.env);
    const secret = c.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345';

    // 1. Check if Station Staff
    const [station] = await db.select().from(stations).where(eq(stations.staffUsername, username)).limit(1);
    if (station && (await bcrypt.compare(password, station.staffPasswordHash))) {
      const token = jwt.sign(
        { stationId: station.id, role: 'staff', stationName: station.name },
        secret,
        { expiresIn: '24h' }
      );
      return c.json({ token, stationId: station.id, stationName: station.name, role: 'staff' });
    }

    // 2. Check if Super Admin
    const [admin] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
      const token = jwt.sign(
        { adminId: admin.id, role: 'admin', username: admin.username },
        secret,
        { expiresIn: '24h' }
      );
      const allStations = await db.select().from(stations);
      const defaultStation = allStations[0] || { id: 'default', name: 'Default Station' };
      return c.json({
        token,
        stationId: defaultStation.id,
        stationName: defaultStation.name,
        role: 'admin',
        username: admin.username,
      });
    }

    return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credentials are incorrect' } }, 401);
  } catch (err) {
    console.error('Station login error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } }, 500);
  }
});

module.exports = stationAuthRouter;
