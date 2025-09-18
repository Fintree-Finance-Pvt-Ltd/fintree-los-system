// const db = require('../db');

// async function nextCode(entity, prefix) {
//   // atomically increment
//   const [row] = await db.raw(
//     "INSERT INTO id_sequences(entity, last_num) VALUES (?, 100) \
//      ON DUPLICATE KEY UPDATE last_num = last_num + 1",
//     [entity]
//   );
//   // read value
//   const [{ last_num }] = await db('id_sequences').where({ entity }).select('last_num');
//   // format as PREFIX + 5 digits (tweak as needed)
//   const padded = String(last_num).padStart(5, '0');
//   return `${prefix}${padded}`;
// }
// module.exports = { nextCode };


// src/lib/seq.js
const db = require('../db');

const pad = (n, width = 5) => String(n).padStart(width, '0');

async function nextCode(entity, prefix) {
  // This sets LAST_INSERT_ID() to the new counter value on the UPDATE path
  await db.raw(
    `INSERT INTO id_sequences (entity, last_num)
       VALUES (?, 100)
     ON DUPLICATE KEY UPDATE last_num = LAST_INSERT_ID(last_num + 1)`,
    [entity]
  );

  // Fetch the value we just set via LAST_INSERT_ID()
  const [rows] = await db.raw('SELECT LAST_INSERT_ID() AS v');
  const n = rows && rows[0] && rows[0].v ? rows[0].v : 100; // first insert path

  return `${prefix}${pad(n)}`;
}

module.exports = { nextCode };
