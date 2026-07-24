const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { rows } = await pool.query('SELECT count FROM purchase_counter WHERE id=1');
    const count = rows.length ? rows[0].count : 0;

    let price;
    if (count < 100) price = 100;
    else if (count < 300) price = 200;
    else price = 490;

    return { statusCode: 200, headers, body: JSON.stringify({ count, price }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message, price: 490 }) };
  }
};