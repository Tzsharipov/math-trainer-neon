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
    const { userId, deviceFingerprint, deviceName, email } = JSON.parse(event.body);

    // Получаем устройства пользователя
    const { rows: devices } = await pool.query(
      'SELECT * FROM user_devices WHERE user_id=$1',
      [userId]
    );

    const existingDevice = devices.find(d => d.device_fingerprint === deviceFingerprint);

    if (existingDevice) {
      // Обновляем last_login
      await pool.query(
        'UPDATE user_devices SET last_login=NOW() WHERE id=$1',
        [existingDevice.id]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Новое устройство — проверяем лимит
    if (devices.length >= 3) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: '⚠️ Лимит устройств достигнут!' }) };
    }

    // Добавляем новое устройство
    await pool.query(
      'INSERT INTO user_devices (user_id, device_fingerprint, device_name, email) VALUES ($1, $2, $3, $4)',
      [userId, deviceFingerprint, deviceName, email]
    );

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};