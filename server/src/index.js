const { Hono } = require('hono');
const { cors } = require('hono/cors');

const auth = require('./middleware/auth');
const stationAuth = require('./middleware/stationAuth');

const authRouter = require('./routes/auth');
const stationAuthRouter = require('./routes/stationAuth');
const stationsRouter = require('./routes/stations');
const preferencesRouter = require('./routes/preferences');
const parcelsRouter = require('./routes/parcels');
const stationParcelsRouter = require('./routes/stationParcels');
const reportsRouter = require('./routes/reports');

const app = new Hono();

// CORS configuration supporting FRONTEND_URL, Cloudflare Pages, and custom domains
app.use('*', async (c, next) => {
  const envOrigins = c.env?.FRONTEND_URL
    ? c.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : [];

  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        envOrigins.length === 0 ||
        envOrigins.includes(origin) ||
        origin.endsWith('.pages.dev') ||
        origin.includes('localhost')
      ) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Station-Id'],
    exposeHeaders: ['Content-Disposition'],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env?.ENVIRONMENT || 'development',
    runtime: 'cloudflare-workers-hono',
  });
});

// Serve uploaded assets (signatures, documents) from Cloudflare R2
app.get('/uploads/*', async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, '');
  const bucket = c.env?.BUCKET || c.env?.mtsc_parcel_uploads;
  if (bucket) {
    const object = await bucket.get(key);
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

export default app;
