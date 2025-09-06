const db = require('../db');

async function nextCode(entity, prefix) {
  // atomically increment
  const [row] = await db.raw(
    "INSERT INTO id_sequences(entity, last_num) VALUES (?, 100) \
     ON DUPLICATE KEY UPDATE last_num = last_num + 1",
    [entity]
  );
  // read value
  const [{ last_num }] = await db('id_sequences').where({ entity }).select('last_num');
  // format as PREFIX + 5 digits (tweak as needed)
  const padded = String(last_num).padStart(5, '0');
  return `${prefix}${padded}`;
}
module.exports = { nextCode };
