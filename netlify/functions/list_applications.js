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
    const status = event.queryStringParameters?.status;

    let query = 'SELECT * FROM applications ORDER BY created_at DESC';
    const params = [];

    if (status) {
      query = 'SELECT * FROM applications WHERE status=$1 ORDER BY created_at DESC';
      params.push(status);
    }

    const { rows } = await pool.query(query, params);

    return { statusCode: 200, headers, body: JSON.stringify(rows) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};