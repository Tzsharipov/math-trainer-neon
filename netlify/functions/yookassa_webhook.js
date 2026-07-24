const { Pool } = require('pg');
const crypto = require('crypto');
const https = require('https');

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

// Перепроверяем статус платежа напрямую у ЮKassa (не доверяем телу уведомления вслепую)
function checkPaymentStatus(paymentId) {
  return new Promise((resolve, reject) => {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const options = {
      hostname: 'api.yookassa.ru',
      path: `/v3/payments/${paymentId}`,
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  try {
    const notification = JSON.parse(event.body);
    const paymentId = notification.object && notification.object.id;

    if (!paymentId) {
      return { statusCode: 400, body: 'no payment id' };
    }

    const payment = await checkPaymentStatus(paymentId);

    if (payment.status !== 'succeeded') {
      return { statusCode: 200, body: 'ignored' };
    }

    const applicationId = payment.metadata && payment.metadata.applicationId;
    if (!applicationId) {
      return { statusCode: 200, body: 'no applicationId' };
    }

    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1', [applicationId]);
    if (!rows.length) return { statusCode: 200, body: 'application not found' };
    const application = rows[0];

    // Защита от повторной обработки, если ЮKassa пришлёт уведомление дважды
    if (application.user_id) {
      return { statusCode: 200, body: 'already processed' };
    }

    const password = generatePassword();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const userId = crypto.randomUUID();

    // Создаём пользователя с датой окончания подписки через год
    await pool.query(
      `INSERT INTO profiles (id, email, is_paid, password_hash, created_at, subscription_expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 year')`,
      [userId, application.email, true, passwordHash]
    );

    await pool.query(
      'UPDATE applications SET status=$1, paid_at=NOW(), completed_at=NOW(), user_id=$2 WHERE id=$3',
      ['completed', userId, applicationId]
    );

    // Увеличиваем счётчик покупок — это то, что двигает цену 100 → 200 → 490
    await pool.query('UPDATE purchase_counter SET count = count + 1 WHERE id=1');

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
          <p>Доступ действует 1 год. Мы напомним заранее, если понадобится продлить.</p>
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

    return { statusCode: 200, body: 'ok' };

  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};