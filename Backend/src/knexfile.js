require('dotenv').config();

module.exports = {
  client: 'mysql2',
  connection: process.env.DATABASE_URL,
  pool: { min: 1, max: 10 }
};
