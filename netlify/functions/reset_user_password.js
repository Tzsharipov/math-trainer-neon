const { Pool } = require('pg');
const { hashPassword } = require('./_password');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json'
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID пользователя обязателен' }) };
    }

    const { rows } = await pool.query('SELECT email FROM profiles WHERE id=$1', [userId]);
    if (!rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    const newPassword = generatePassword();
    const passwordHash = hashPassword(newPassword);

    await pool.query('UPDATE profiles SET password_hash=$1 WHERE id=$2', [passwordHash, userId]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, email: rows[0].email, password: newPassword })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
