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

// Определяет текущую цену по количеству уже совершённых покупок
async function getCurrentPrice() {
  const { rows } = await pool.query('SELECT count FROM purchase_counter WHERE id=1');
  const count = rows.length ? rows[0].count : 0;
  if (count < 100) return 100;
  if (count < 300) return 200;
  return 490;
}

// Отправляет запрос к серверам ЮKassa
function yookassaRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'api.yookassa.ru',
      path,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': crypto.randomUUID()
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { applicationId } = JSON.parse(event.body);

    if (!applicationId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID заявки обязателен' }) };
    }

    const { rows } = await pool.query('SELECT * FROM applications WHERE id=$1', [applicationId]);
    if (!rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Заявка не найдена' }) };
    }
    const application = rows[0];

    const price = await getCurrentPrice();

    const paymentBody = {
      amount: { value: price + '.00', currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: 'https://stolbik.online/app.html'
      },
      description: `Доступ к Математическому тренажёру на год, заявка ${application.application_number}`,
      metadata: { applicationId: String(applicationId) }
    };

    const result = await yookassaRequest('/v3/payments', 'POST', paymentBody);

    if (result.statusCode !== 200 && result.statusCode !== 201) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ошибка создания платежа', details: result.body }) };
    }

    await pool.query('UPDATE applications SET payment_id=$1 WHERE id=$2', [result.body.id, applicationId]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ confirmationUrl: result.body.confirmation.confirmation_url, price })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};