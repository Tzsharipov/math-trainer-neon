const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;

// Формат нового хэша: "scrypt:<salt_hex>:<hash_hex>"
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

// Поддерживает и новый формат (scrypt+соль), и старый (голый sha256 без соли)
// — чтобы аккаунты, созданные до этого фикса, не сломались.
function verifyPassword(password, stored) {
  if (!stored) return false;

  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const hashBuffer = Buffer.from(hash, 'hex');
    const candidateBuffer = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    if (hashBuffer.length !== candidateBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
  }

  // Легаси: старые аккаунты, захешированные простым sha256 без соли
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return legacyHash === stored;
}

// true, если хэш ещё старого (небезопасного) формата и его пора обновить
function needsRehash(stored) {
  return !stored || !stored.startsWith('scrypt:');
}

module.exports = { hashPassword, verifyPassword, needsRehash };
