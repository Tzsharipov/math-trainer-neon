const { Pool } = require('pg');
const crypto = require('crypto');
const https = require('https');

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
    const { email, applicationId } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email обязателен' }) };
    }

    const password = generatePassword();
    const userId = crypto.randomUUID();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    await pool.query(
      'INSERT INTO profiles (id, email, is_paid, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [userId, email.toLowerCase(), false, passwordHash]
    );

    if (applicationId) {
      await pool.query(
        'UPDATE applications SET user_id=$1, status=$2, completed_at=NOW() WHERE id=$3',
        [userId, 'completed', applicationId]
      );
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, email: email.toLowerCase(), password }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};