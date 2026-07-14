const { Pool } = require('pg');
const https = require('https');
const crypto = require('crypto');
const { hashPassword } = require('./_password');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { applicationId, status } = JSON.parse(event.body);

    if (!applicationId || !status) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверные параметры' }) };
    }

    if (status !== 'paid') {
      await pool.query('UPDATE applications SET status=$1 WHERE id=$2', [status, applicationId]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Получаем заявку
    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1', [applicationId]);
    if (!rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Заявка не найдена' }) };
    }

    const application = rows[0];

    if (application.user_id) {
      await pool.query('UPDATE applications SET status=$1, paid_at=$2 WHERE id=$3', 
        ['completed', new Date().toISOString(), applicationId]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    const password = generatePassword();
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    // Создаём профиль
    await pool.query(
      'INSERT INTO profiles (id, email, is_paid, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, application.email, true, passwordHash, new Date().toISOString()]
    );

    // Обновляем заявку
    await pool.query(
      'UPDATE applications SET status=$1, paid_at=$2, completed_at=$3, user_id=$4 WHERE id=$5',
      ['completed', new Date().toISOString(), new Date().toISOString(), userId, applicationId]
    );

    // Отправляем email через Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const emailData = JSON.stringify({
        from: 'Математический тренажёр <info@stolbik.online>',
        to: [application.email],
        subject: 'Ваш доступ к Математическому тренажёру',
        html: `<div style="font-family: Arial, sans-serif;">
          <h1 style="color: #667eea;">🎉 Доступ открыт!</h1>
          <p>Оплата подтверждена. Ваши данные для входа${application.child_name ? ' для <strong>' + application.child_name + '</strong>' : ''}:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <p><strong>Email:</strong> ${application.email}</p>
            <p><strong>Пароль:</strong> <span style="font-size: 20px; color: #dc2626;">${password}</span></p>
          </div>
          <p><a href="https://stolbik.online/app.html">https://stolbik.online/app.html</a></p>
          <p style="color: #6b7280; font-size: 14px;">При вопросах: @SharipovT</p>
        </div>`
      });

      await new Promise((resolve) => {
        const req = https.request({
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
            'Content-Length': Buffer.byteLength(emailData)
          }
        }, resolve);
        req.write(emailData);
        req.end();
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, userId, email: application.email }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};