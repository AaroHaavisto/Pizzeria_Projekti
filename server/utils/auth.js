import {promisify} from 'node:util';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const scrypt = promisify(scryptCallback);

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
}

export async function verifyPassword(password, hash) {
  if (typeof hash !== 'string') {
    return false;
  }

  if (!hash.startsWith('scrypt$')) {
    return password === hash;
  }

  const [algorithm, salt, storedHex] = hash.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedHex) {
    return false;
  }

  const key = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(storedHex, 'hex');
  const keyBuffer = Buffer.from(key);

  if (storedBuffer.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, keyBuffer);
}