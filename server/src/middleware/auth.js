const jwt = require('jsonwebtoken');

function auth() {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: { code: 'NO_TOKEN', message: 'Authentication required' } }, 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET || 'dev_secret_key_change_in_production_12345';

    try {
      const decoded = jwt.verify(token, secret);
      c.set('user', decoded);
      await next();
    } catch (err) {
      return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }, 401);
    }
  };
}

module.exports = auth;
