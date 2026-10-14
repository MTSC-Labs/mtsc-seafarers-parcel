const { Hono } = require('hono');
const { eq, and } = require('drizzle-orm');
const { getDb, preferredStations } = require('../db');

const preferencesRouter = new Hono();

// GET /api/preferences/stations
preferencesRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env);

    const prefs = await db.select({
      id: preferredStations.id,
      stationId: preferredStations.stationId,
    }).from(preferredStations).where(eq(preferredStations.userId, user.userId));

    return c.json(prefs);
  } catch (err) {
    console.error('Fetch preferences error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch preferences' } }, 500);
  }
});

// POST /api/preferences/stations
preferencesRouter.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { stationId } = await c.req.json();
    if (!stationId) {
      return c.json({ error: { code: 'MISSING_FIELDS', message: 'stationId is required' } }, 400);
    }

    const db = getDb(c.env);

    // Check if already exists
    const [existing] = await db.select().from(preferredStations).where(
      and(
        eq(preferredStations.userId, user.userId),
        eq(preferredStations.stationId, stationId)
      )
    ).limit(1);

    if (existing) {
      return c.json({ id: existing.id, stationId: existing.stationId }, 200);
    }

    const [created] = await db.insert(preferredStations).values({
      userId: user.userId,
      stationId,
    }).returning();

    return c.json({ id: created.id, stationId: created.stationId }, 201);
  } catch (err) {
    console.error('Save preference error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to save preference' } }, 500);
  }
});

// DELETE /api/preferences/stations/:stationId
preferencesRouter.delete('/:stationId', async (c) => {
  try {
    const user = c.get('user');
    const stationId = c.req.param('stationId');

    const db = getDb(c.env);
    const deleted = await db.delete(preferredStations).where(
      and(
        eq(preferredStations.userId, user.userId),
        eq(preferredStations.stationId, stationId)
      )
    ).returning();

    if (!deleted || deleted.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Preference not found' } }, 404);
    }

    return c.json({ message: 'Preference removed' });
  } catch (err) {
    console.error('Delete preference error:', err);
    return c.json({ error: { code: 'SERVER_ERROR', message: 'Failed to remove preference' } }, 500);
  }
});

module.exports = preferencesRouter;
