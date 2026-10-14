const { Hono } = require('hono');
const { cors } = require('hono/cors');

const auth = require('./hono/middleware/auth');
const stationAuth = require('./hono/middleware/stationAuth');

const authRouter = require('./hono/routes/auth');
const stationAuthRouter = require('./hono/routes/stationAuth');
const stationsRouter = require('./hono/routes/stations');
const preferencesRouter = require('./hono/routes/preferences');
const parcelsRouter = require('./hono/routes/parcels');
const stationParcelsRouter = require('./hono/routes/stationParcels');
const reportsRouter = require('./hono/routes/reports');

const app = new Hono();

// CORS configuration matching your frontend
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Station-Id'],
  exposeHeaders: ['Content-Disposition'],
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    runtime: 'cloudflare-workers-hono',
  });
});

// Serve uploaded assets (signatures, documents) from Cloudflare R2
app.get('/uploads/*', async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, '');
  if (c.env.BUCKET) {
    const object = await c.env.BUCKET.get(key);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      return new Response(object.body, { headers });
    }
  }
  return c.text('Asset not found', 404);
});

// Public authentication routes
app.route('/api/auth', authRouter);
app.route('/api/auth/station', stationAuthRouter);

// Seafarer authenticated routes
app.use('/api/stations', auth());
app.use('/api/stations/*', auth());
app.route('/api/stations', stationsRouter);

app.use('/api/preferences/stations', auth());
app.use('/api/preferences/stations/*', auth());
app.route('/api/preferences/stations', preferencesRouter);

app.use('/api/parcels', auth());
app.use('/api/parcels/*', auth());
app.route('/api/parcels', parcelsRouter);

// Station staff & Admin authenticated routes
app.use('/api/station/parcels', stationAuth());
app.use('/api/station/parcels/*', stationAuth());
app.route('/api/station/parcels', stationParcelsRouter);

app.use('/api/station/reports', stationAuth());
app.use('/api/station/reports/*', stationAuth());
app.route('/api/station/reports', reportsRouter);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled worker error:', err);
  return c.json({
    error: {
      code: 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  }, 500);
});

module.exports = app;
