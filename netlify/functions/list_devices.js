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
    const { userId, email } = event.queryStringParameters || {};

    if (!userId && !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Нужен userId или email' }) };
    }

    let query, params;
    if (userId) {
      query = 'SELECT * FROM user_devices WHERE user_id=$1 ORDER BY created_at DESC';
      params = [userId];
    } else {
      query = 'SELECT * FROM user_devices WHERE email=$1 ORDER BY created_at DESC';
      params = [email.toLowerCase()];
    }

    const { rows } = await pool.query(query, params);

    return { statusCode: 200, headers, body: JSON.stringify(rows) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
