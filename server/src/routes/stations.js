const { Hono } = require('hono');
const { getDb, stations } = require('../db');

const stationsRouter = new Hono();

// GET /api/stations
stationsRouter.get('/', async (c) => {
  try {
    const db = getDb(c.env);
    const stationList = await db.select({
      id: stations.id,
      name: stations.name,
      address: stations.address,
      phone: stations.phone,
      email: stations.email,
    }).from(stations);

    return c.json(stationList);
  } catch (err) {
    console.error('Fetch stations error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch stations' } }, 500);
  }
});

module.exports = stationsRouter;
