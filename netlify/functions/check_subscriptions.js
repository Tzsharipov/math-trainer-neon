const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function sendReminderEmail(email, childName) {
  return new Promise((resolve) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return resolve();

    const emailData = JSON.stringify({
      from: 'Математический тренажёр <info@stolbik.online>',
      to: [email],
      subject: 'Скоро закончится доступ к Математическому тренажёру',
      html: `<div style="font-family: Arial, sans-serif;">
        <h1 style="color: #f59e0b;">⏰ Доступ скоро закончится</h1>
        <p>Через 30 дней закончится годовой доступ к тренажёру${childName ? ' для <strong>' + childName + '</strong>' : ''}.</p>
        <p>Чтобы продолжить занятия без перерыва, продлите доступ на сайте:</p>
        <p><a href="https://stolbik.online">https://stolbik.online</a></p>
        <p style="color: #6b7280; font-size: 14px;">При вопросах: @SharipovT</p>
      </div>`
    });

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
    req.on('error', resolve);
    req.write(emailData);
    req.end();
  });
}

exports.handler = async () => {
  try {
    // 1. Находим тех, кому нужно отправить напоминание за 30 дней
    const { rows: toRemind } = await pool.query(`
      SELECT id, email, child_name FROM profiles
      WHERE is_paid = true
        AND reminder_sent = false
        AND subscription_expires_at IS NOT NULL
        AND subscription_expires_at <= NOW() + INTERVAL '30 days'
        AND subscription_expires_at > NOW()
    `);

    for (const user of toRemind) {
      await sendReminderEmail(user.email, user.child_name);
      await pool.query('UPDATE profiles SET reminder_sent = true WHERE id=$1', [user.id]);
    }

    // 2. Отключаем доступ тем, у кого подписка истекла
    const { rows: expired } = await pool.query(`
      UPDATE profiles SET is_paid = false
      WHERE is_paid = true
        AND subscription_expires_at IS NOT NULL
        AND subscription_expires_at <= NOW()
      RETURNING id, email
    `);

    return {
      statusCode: 200,
      body: JSON.stringify({
        remindersSent: toRemind.length,
        subscriptionsExpired: expired.length
      })
    };

  } catch (err) {
    console.error('CHECK_SUBSCRIPTIONS ERROR:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};