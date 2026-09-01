import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from './config.mjs';

export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
export const hmac = value => createHmac('sha256', config.otpSecret).update(String(value)).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const randomOtp = () => String(randomInt(100000, 1000000));
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
};

const sealKey = createHash('sha256').update(config.sessionSecret).digest();
const dataKey = createHash('sha256').update(config.dataEncryptionKey).digest();
export function seal(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
export function unseal(value) {
  const [ivText, tagText, encryptedText] = String(value || '').split('.');
  if (!ivText || !tagText || !encryptedText) throw Object.assign(new Error('登入流程資料無效。'), { status: 400 });
  try {
    const decipher = createDecipheriv('aes-256-gcm', sealKey, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw Object.assign(new Error('登入流程資料無效。'), { status: 400 });
  }
}

export const emailLookup = value => createHmac('sha256', dataKey).update(normalizeEmail(value)).digest('hex');
export function protect(value) {
  if (value === null || value === undefined || value === '') return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
export function unprotect(value) {
  if (!value) return '';
  const [version, ivText, tagText, encryptedText] = String(value).split('.');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw Object.assign(new Error('加密資料格式不正確。'), { status: 500 });
  try {
    const decipher = createDecipheriv('aes-256-gcm', dataKey, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw Object.assign(new Error('無法解讀加密資料，請由管理者檢查金鑰。'), { status: 500 });
  }
}

export const encryptedEmail = email => ({ lookup: emailLookup(email), cipher: protect(normalizeEmail(email)) });
export const revealEmail = row => row?.email_cipher ? normalizeEmail(unprotect(row.email_cipher)) : normalizeEmail(row?.email);

export function studentProfile(email) {
  const match = normalizeEmail(email).match(/^s(113|114|115)(0[1-9]|1\d|20)(0[1-9]|[12]\d|3\d|40)@lmjh\.tp\.edu\.tw$/);
  if (!match) return null;
  return {
    admissionYear: match[1],
    grade: { '113': 9, '114': 8, '115': 7 }[match[1]],
    classNumber: Number(match[2]),
    seatNumber: Number(match[3]),
    classCode: `${{ '113': 9, '114': 8, '115': 7 }[match[1]]}${match[2]}`,
  };
}

export const cookieMap = header => Object.fromEntries(String(header || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x.length === 2));
export const sessionCookie = (token, maxAge) => `mm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.production ? '; Secure' : ''}`;
export const clearSessionCookie = () => `mm_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.production ? '; Secure' : ''}`;

export function securityHeaders(nonce = '') {
  const script = nonce ? `'self' 'nonce-${nonce}'` : `'self'`;
  return {
    'Content-Security-Policy': `default-src 'self'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'${config.production ? '; upgrade-insecure-requests' : ''}`,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
    ...(config.production ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' } : {}),
  };
}

export const validateText = (value, max, required = true) => {
  const text = String(value || '').trim();
  if ((required && !text) || text.length > max) throw Object.assign(new Error('輸入資料格式不正確'), { status: 400 });
  return text;
};
