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
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId обязателен' }) };
    }

    const { rows } = await pool.query('SELECT is_paid FROM profiles WHERE id=$1', [userId]);

    if (!rows.length) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    if (!rows[0].is_paid) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Доступ не оплачен' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, isPaid: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
