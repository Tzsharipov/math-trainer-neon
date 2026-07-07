const { Pool } = require('pg');
const crypto = require('crypto');

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
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email и пароль обязательны' }) };
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE email=$1 AND password_hash=$2',
      [email.toLowerCase(), passwordHash]
    );

    if (!rows.length) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Неверный email или пароль' }) };
    }

    const user = rows[0];

    if (!user.is_paid) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Доступ не оплачен' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, userId: user.id, email: user.email }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};