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
    const { email, childName, payerName, telegram } = JSON.parse(event.body);

    if (!email || !childName || !payerName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Заполните все обязательные поля' }) };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный формат email' }) };
    }

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const applicationNumber = `APP-${dateStr}-${randomNum}`;

    const { rows } = await pool.query(
      `INSERT INTO applications (application_number, email, child_name, payer_name, telegram, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending_payment', NOW()) RETURNING *`,
      [applicationNumber, email.toLowerCase().trim(), childName.trim(), payerName.trim(), telegram ? telegram.trim() : null]
    );

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, applicationId: rows[0].id, applicationNumber, message: 'Заявка успешно создана' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};