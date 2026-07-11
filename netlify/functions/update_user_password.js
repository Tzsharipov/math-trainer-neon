const { Pool } = require('pg');
const { verifyPassword, hashPassword } = require('./_password');

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
    const { email, currentPassword, newPassword } = JSON.parse(event.body);

    if (!email || !currentPassword) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email и текущий пароль обязательны' }) };
    }

    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE email=$1',
      [email.toLowerCase()]
    );

    if (!rows.length || !verifyPassword(currentPassword, rows[0].password_hash)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Неверный текущий пароль' }) };
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Новый пароль должен быть минимум 6 символов' }) };
      }
      const newHash = hashPassword(newPassword);
      await pool.query('UPDATE profiles SET password_hash=$1 WHERE email=$2', [newHash, email.toLowerCase()]);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
