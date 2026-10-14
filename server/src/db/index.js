const { drizzle } = require('drizzle-orm/d1');
const schema = require('./schema');

function getDb(env) {
  if (!env || !env.DB) {
    throw new Error('D1 database binding "DB" is not available in environment');
  }
  return drizzle(env.DB, { schema });
}

module.exports = {
  getDb,
  ...schema,
};
