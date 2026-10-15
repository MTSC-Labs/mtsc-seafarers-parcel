const { drizzle } = require('drizzle-orm/d1');
const schema = require('./schema');

function getDb(env) {
  const d1 = env?.DB || env?.mtsc_parcel_db;
  if (!d1) {
    throw new Error('D1 database binding ("DB" or "mtsc_parcel_db") is not available in environment');
  }
  return drizzle(d1, { schema });
}

module.exports = {
  getDb,
  ...schema,
};
