const jwt = require('jsonwebtoken');

function stationAuth() {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: { code: 'NO_TOKEN', message: 'Authentication required' } }, 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345';

    try {
      const decoded = jwt.verify(token, secret);
      if (decoded.role !== 'staff' && decoded.role !== 'admin') {
        return c.json({ error: { code: 'FORBIDDEN', message: 'Staff or Admin access required' } }, 403);
      }

      // If admin, they can override the stationId via header
      if (decoded.role === 'admin') {
        const targetStationId = c.req.header('x-station-id');
        if (targetStationId) {
          decoded.stationId = targetStationId;
        }
      }

      c.set('user', decoded);
      await next();
    } catch (err) {
      return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }, 401);
    }
  };
}

module.exports = stationAuth;
