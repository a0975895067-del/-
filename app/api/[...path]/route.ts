import { env } from 'cloudflare:workers';

type Row = Record<string, any>;
type Role = 'student' | 'teacher' | 'developer' | 'approved_user';
const PRIVACY_VERSION = '2026-09-01';
const SESSION_SECONDS = 8 * 60 * 60;
const REPORT_DAYS = 365;

class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const cf = () => env as unknown as Cloudflare.Env;
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const enc = new TextEncoder();
const dec = new TextDecoder();
const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const randomToken = (bytes = 32) => { const value = new Uint8Array(bytes); crypto.getRandomValues(value); return b64url(value); };

async function digest(value: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))));
}
async function hmac(value: string) {
  const secret = cf().OTP_SECRET;
  if (!secret || secret.length < 32) throw new ApiError('伺服器安全金鑰尚未完成設定。', 503);
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))));
}
async function emailLookup(email: string) { return hmac(`email:${normalizeEmail(email)}`); }
async function aesKey() {
  const secret = cf().DATA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new ApiError('資料加密金鑰尚未完成設定。', 503);
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(value: string) {
  const iv = new Uint8Array(12); crypto.getRandomValues(iv);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(value)));
  return `${b64url(iv)}.${b64url(ciphertext)}`;
}
async function unseal(value: string) {
  const [iv, ciphertext] = String(value || '').split('.');
  if (!iv || !ciphertext) throw new ApiError('加密資料格式錯誤。', 500);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv.replace(/-/g, '+').replace(/_/g, '/')) }, await aesKey(), unb64(ciphertext.replace(/-/g, '+').replace(/_/g, '/')));
  return dec.decode(plaintext);
}
async function safeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  if (a.length !== b.length) return false;
  let mismatch = 0; for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
async function passwordDigest(password: string, salt: string) {
  if (password.length < 12 || password.length > 200) throw new ApiError('密碼至少需要 12 個字元。');
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 310_000 }, key, 256);
  return b64url(new Uint8Array(bits));
}
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes: Uint8Array) {
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += base32Alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}
function base32Decode(value: string) {
  let bits = 0, buffer = 0; const output: number[] = [];
  for (const char of value.toUpperCase().replace(/[^A-Z2-7]/g, '')) { const index = base32Alphabet.indexOf(char); if (index < 0) continue; buffer = (buffer << 5) | index; bits += 5; if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(output);
}
async function totpCode(secret: string, counter: number) {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const message = new Uint8Array(8); let value = BigInt(counter); for (let i = 7; i >= 0; i--) { message[i] = Number(value & 255n); value >>= 8n; }
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, message)); const offset = signed[signed.length - 1] & 15;
  const binary = ((signed[offset] & 127) << 24) | (signed[offset + 1] << 16) | (signed[offset + 2] << 8) | signed[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}
async function verifyTotp(secret: string, otp: unknown, lastCounter: number | null = null) {
  const candidate = String(otp || ''); if (!/^\d{6}$/.test(candidate)) return null; const current = Math.floor(Date.now() / 30_000);
  for (const counter of [current - 1, current, current + 1]) if ((lastCounter == null || counter > lastCounter) && await safeEqual(await totpCode(secret, counter), candidate)) return counter;
  return null;
}
function inviteCode() {
  const bytes = new Uint8Array(9); crypto.getRandomValues(bytes); return base32Encode(bytes).match(/.{1,4}/g)!.join('-');
}

function json(data: unknown, status = 200, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 200_000) throw new ApiError('送出的資料量過大。', 413);
  try { return text ? JSON.parse(text) : {}; } catch { throw new ApiError('資料格式錯誤。'); }
}
function textValue(value: unknown, max: number, required = true) {
  const result = String(value || '').trim();
  if (required && !result) throw new ApiError('必填資料不完整。');
  if (result.length > max) throw new ApiError('輸入內容過長。');
  return result;
}
function ip(request: Request) { return request.headers.get('cf-connecting-ip') || 'unknown'; }
async function ipDigest(request: Request) { return digest(`ip:${ip(request)}`); }
async function userAgentDigest(request: Request) { return digest(`ua:${request.headers.get('user-agent') || ''}`); }
function cookieMap(request: Request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x.length === 2));
}
function sessionCookie(token: string, maxAge = SESSION_SECONDS) { return `mm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
function clearCookie() { return 'mm_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'; }

function studentProfile(email: string) {
  const match = normalizeEmail(email).match(/^s(113|114|115)(0[1-9]|1\d|20)(0[1-9]|[12]\d|3\d|40)@lmjh\.tp\.edu\.tw$/);
  if (!match) return null;
  const grade = ({ '113': 9, '114': 8, '115': 7 } as Record<string, number>)[match[1]];
  return { grade, classNumber: Number(match[2]), seatNumber: Number(match[3]), code: `${grade}${match[2]}` };
}
async function rateLimit(bucket: string, maximum: number, windowSeconds: number) {
  const current = Date.now();
  const row = await cf().DB.prepare('SELECT count, reset_at FROM rate_limits WHERE bucket=?').bind(bucket).first<Row>();
  if (!row || Date.parse(row.reset_at) <= current) {
    await cf().DB.prepare('INSERT INTO rate_limits(bucket,count,reset_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=1,reset_at=excluded.reset_at').bind(bucket, new Date(current + windowSeconds * 1000).toISOString()).run();
    return;
  }
  if (Number(row.count) >= maximum) throw new ApiError('嘗試次數過多，請稍後再試。', 429);
  await cf().DB.prepare('UPDATE rate_limits SET count=count+1 WHERE bucket=?').bind(bucket).run();
}
async function audit(actor: string | null, action: string, targetType = '', targetId = '', outcome = 'success', metadata: unknown = {}) {
  await cf().DB.prepare('INSERT INTO audit_logs(id,actor_id,action,target_type,target_id,outcome,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .bind(uuid(), actor, action, targetType, targetId, outcome, JSON.stringify(metadata).slice(0, 4000), now()).run();
}
async function sendOtp(email: string, otp: string) {
  const e = cf();
  if (!e.EMAIL_API_URL || !e.EMAIL_API_KEY || !e.EMAIL_FROM) throw new ApiError('驗證信服務尚未啟用；啟用後請至信箱收取驗證碼。', 503);
  const provider = String(e.EMAIL_PROVIDER || (e.EMAIL_API_URL.includes('brevo.com') ? 'brevo' : 'resend')).toLowerCase();
  const message = `您的驗證碼是 ${otp}，10 分鐘內有效。若非本人操作，請忽略此信。`;
  const brevo = provider === 'brevo';
  const response = await fetch(e.EMAIL_API_URL, {
    method: 'POST',
    headers: brevo
      ? { 'api-key': e.EMAIL_API_KEY, 'content-type': 'application/json' }
      : { authorization: `Bearer ${e.EMAIL_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': `math-otp-${await digest(`${email}:${otp}`)}` },
    body: JSON.stringify(brevo
      ? { sender: { name: '數學任務站', email: e.EMAIL_FROM }, to: [{ email }], subject: '數學任務站登入驗證碼', textContent: message }
      : { from: `數學任務站 <${e.EMAIL_FROM}>`, to: [email], subject: '數學任務站登入驗證碼', text: message }),
  });
  if (!response.ok) throw new ApiError('驗證信目前無法寄出，請確認寄件人已驗證或稍後再試。', 503);
}
async function createChallenge(request: Request, emailValue: unknown, purpose: string) {
  const email = normalizeEmail(emailValue);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new ApiError('請輸入有效的電子郵件。');
  const lookup = await emailLookup(email); const ipKey = await ipDigest(request);
  await rateLimit(`otp-email:${lookup}`, 3, 15 * 60); await rateLimit(`otp-ip:${ipKey}`, 10, 15 * 60);
  const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
  const id = uuid(); const created = now(); const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  await cf().DB.prepare('INSERT INTO auth_challenges(id,email_lookup,email_cipher,purpose,otp_digest,attempts,expires_at,created_at,ip_digest) VALUES(?,?,?,?,?,0,?,?,?)')
    .bind(id, lookup, await seal(email), purpose, await hmac(`otp:${id}:${otp}`), expires, created, ipKey).run();
  try { await sendOtp(email, otp); } catch (error) { await cf().DB.prepare('DELETE FROM auth_challenges WHERE id=?').bind(id).run(); throw error; }
  return { challengeId: id };
}
async function consumeChallenge(request: Request, challengeId: unknown, otpValue: unknown, expected: string | RegExp) {
  const id = textValue(challengeId, 80), otp = String(otpValue || '');
  if (!/^\d{6}$/.test(otp)) throw new ApiError('請輸入信件中的 6 位數驗證碼。');
  const row = await cf().DB.prepare('SELECT * FROM auth_challenges WHERE id=?').bind(id).first<Row>();
  const purposeOk = typeof expected === 'string' ? row?.purpose === expected : expected.test(String(row?.purpose || ''));
  if (!row || !purposeOk || row.consumed_at || Date.parse(row.expires_at) <= Date.now() || Number(row.attempts) >= 5) throw new ApiError('驗證碼已失效，請重新取得。', 401);
  const matches = await safeEqual(row.otp_digest, await hmac(`otp:${id}:${otp}`));
  if (!matches) { await cf().DB.prepare('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?').bind(id).run(); throw new ApiError('驗證碼錯誤；連續錯誤 5 次後會失效。', 401); }
  await cf().DB.prepare('UPDATE auth_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(now(), id).run();
  return { ...row, email: await unseal(row.email_cipher) };
}

async function publicUser(row: Row) {
  return { id: row.id || row.user_id, email: await unseal(row.email_cipher), role: row.role as Role, grade: row.grade ?? null, classNumber: row.class_number ?? null, seatNumber: row.seat_number ?? null };
}
async function findUser(email: string) { return cf().DB.prepare('SELECT * FROM users WHERE email_lookup=?').bind(await emailLookup(email)).first<Row>(); }
async function ensureStudent(email: string) {
  const profile = studentProfile(email); if (!profile) throw new ApiError('目前僅開放龍門國中學生直接使用；其他身分請提出申請。', 403);
  const lookup = await emailLookup(email); let user = await cf().DB.prepare('SELECT * FROM users WHERE email_lookup=?').bind(lookup).first<Row>(); const timestamp = now();
  if (!user) {
    const id = uuid(); await cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,grade,class_number,seat_number,created_at,updated_at) VALUES(?,?,?,'student','active',?,?,?,?,?)")
      .bind(id, lookup, await seal(email), profile.grade, profile.classNumber, profile.seatNumber, timestamp, timestamp).run(); user = await cf().DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first<Row>();
  }
  if (user?.role !== 'student' || user.status !== 'active') throw new ApiError('帳號狀態無法登入，請聯絡管理者。', 403);
  await cf().DB.prepare('INSERT INTO classes(id,code,grade,class_number,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(profile.code, profile.code, profile.grade, profile.classNumber, timestamp).run();
  await cf().DB.prepare('INSERT INTO class_students(class_id,student_id,joined_at) VALUES(?,?,?) ON CONFLICT(class_id,student_id) DO NOTHING').bind(profile.code, user.id, timestamp).run();
  return user!;
}
async function acknowledge(userId: string, version: unknown) {
  if (version !== PRIVACY_VERSION) throw new ApiError('請重新閱讀並確認最新版個人資料告知事項。');
  await cf().DB.prepare('INSERT INTO privacy_acknowledgements(user_id,version,acknowledged_at) VALUES(?,?,?) ON CONFLICT(user_id,version) DO NOTHING').bind(userId, PRIVACY_VERSION, now()).run();
}
async function createSession(request: Request, user: Row) {
  const token = randomToken(); const csrf = randomToken(); const id = uuid();
  await cf().DB.prepare('INSERT INTO sessions(id,token_digest,user_id,csrf_digest,expires_at,last_seen_at,ip_digest,user_agent_digest) VALUES(?,?,?,?,?,?,?,?)')
    .bind(id, await digest(token), user.id, await digest(csrf), new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(), now(), await ipDigest(request), await userAgentDigest(request)).run();
  return { token, csrfToken: csrf, user: await publicUser(user) };
}
async function authenticate(request: Request, roles?: Role[]) {
  const token = cookieMap(request).mm_session; if (!token) throw new ApiError('請先登入。', 401);
  const session = await cf().DB.prepare(`SELECT s.*,u.email_cipher,u.role,u.status,u.grade,u.class_number,u.seat_number FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_digest=?`).bind(await digest(token)).first<Row>();
  if (!session || Date.parse(session.expires_at) <= Date.now() || session.status !== 'active') throw new ApiError('登入狀態已失效，請重新登入。', 401);
  if (roles && !roles.includes(session.role)) throw new ApiError('您沒有執行此操作的權限。', 403);
  await cf().DB.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').bind(now(), session.id).run();
  return session;
}
async function requireCsrf(request: Request, session: Row) {
  const origin = request.headers.get('origin'); const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin && origin !== cf().PUBLIC_ORIGIN) throw new ApiError('來源驗證失敗。', 403);
  const token = request.headers.get('x-csrf-token') || '';
  if (!token || !(await safeEqual(session.csrf_digest, await digest(token)))) throw new ApiError('安全驗證已失效，請重新整理頁面。', 403);
}

async function makeApplication(row: Row, data: Row, emailVerified = true) {
  const identity = textValue(data.identity, 80), workplace = textValue(data.workplace, 120), jobTitle = textValue(data.jobTitle, 120);
  const id = uuid();
  await cf().DB.prepare("INSERT INTO access_applications(id,email_lookup,email_cipher,identity_cipher,workplace_cipher,job_title_cipher,email_verified,status,requested_at) VALUES(?,?,?,?,?,?,?,'pending',?)")
    .bind(id, row.email_lookup, row.email_cipher, await seal(identity), await seal(workplace), await seal(jobTitle), emailVerified ? 1 : 0, now()).run();
  return { id, status: 'pending' };
}

function oidcEnabled() {
  const e = cf(); return Boolean(e.EDU_OIDC_ISSUER && e.EDU_OIDC_CLIENT_ID && e.EDU_OIDC_CLIENT_SECRET && e.EDU_OIDC_REDIRECT_URI);
}
async function oidcDiscovery() {
  if (!oidcEnabled()) throw new ApiError('教育雲端帳號介接尚未啟用。', 503);
  const issuer = cf().EDU_OIDC_ISSUER!.replace(/\/$/, '');
  const response = await fetch(`${issuer}/.well-known/openid-configuration`); if (!response.ok) throw new ApiError('教育雲端身分服務暫時無法連線。', 503);
  const doc = await response.json<Row>();
  if (String(doc.issuer).replace(/\/$/, '') !== issuer || !doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) throw new ApiError('教育雲端身分服務設定不符合安全要求。', 503);
  return doc;
}
async function verifyIdToken(token: string, nonce: string, discovery: Row) {
  const parts = token.split('.'); if (parts.length !== 3) throw new ApiError('教育雲端身分權杖格式錯誤。', 401);
  const parse = (value: string) => JSON.parse(dec.decode(unb64(value.replace(/-/g, '+').replace(/_/g, '/'))));
  const header = parse(parts[0]), payload = parse(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new ApiError('教育雲端權杖演算法不受信任。', 401);
  const jwksResponse = await fetch(discovery.jwks_uri); if (!jwksResponse.ok) throw new ApiError('無法取得教育雲端簽章金鑰。', 503);
  const jwks = await jwksResponse.json<Row>(); const jwk = (jwks.keys || []).find((key: Row) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new ApiError('找不到教育雲端簽章金鑰。', 401);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64(parts[2].replace(/-/g, '+').replace(/_/g, '/')), enc.encode(`${parts[0]}.${parts[1]}`));
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]; const issuer = cf().EDU_OIDC_ISSUER!.replace(/\/$/, '');
  if (!valid || String(payload.iss).replace(/\/$/, '') !== issuer || !audience.includes(cf().EDU_OIDC_CLIENT_ID) || Number(payload.exp) * 1000 <= Date.now() || payload.nonce !== nonce) throw new ApiError('教育雲端身分權杖驗證失敗。', 401);
  return payload;
}
async function beginOidc(request: Request, url: URL) {
  const privacy = url.searchParams.get('privacy'); if (privacy !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
  const doc = await oidcDiscovery(); const state = randomToken(), nonce = randomToken(), verifier = randomToken(48);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));
  await cf().DB.prepare('INSERT INTO education_oidc_states(id,state_digest,nonce,verifier_cipher,ip_digest,privacy_version,expires_at) VALUES(?,?,?,?,?,?,?)')
    .bind(uuid(), await digest(state), nonce, await seal(verifier), await ipDigest(request), privacy, new Date(Date.now() + 10 * 60_000).toISOString()).run();
  const target = new URL(doc.authorization_endpoint); Object.entries({ response_type: 'code', client_id: cf().EDU_OIDC_CLIENT_ID!, redirect_uri: cf().EDU_OIDC_REDIRECT_URI!, scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256' }).forEach(([k, v]) => target.searchParams.set(k, v));
  return Response.redirect(target, 302);
}
async function finishOidc(request: Request, url: URL) {
  const state = textValue(url.searchParams.get('state'), 500), code = textValue(url.searchParams.get('code'), 2000);
  const row = await cf().DB.prepare('SELECT * FROM education_oidc_states WHERE state_digest=?').bind(await digest(state)).first<Row>();
  if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now() || row.ip_digest !== await ipDigest(request)) throw new ApiError('教育雲端登入流程已失效，請重新開始。', 401);
  await cf().DB.prepare('UPDATE education_oidc_states SET consumed_at=? WHERE id=?').bind(now(), row.id).run();
  const doc = await oidcDiscovery(); const tokenResponse = await fetch(doc.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: cf().EDU_OIDC_REDIRECT_URI!, client_id: cf().EDU_OIDC_CLIENT_ID!, client_secret: cf().EDU_OIDC_CLIENT_SECRET!, code_verifier: await unseal(row.verifier_cipher) }) });
  if (!tokenResponse.ok) throw new ApiError('教育雲端登入交換失敗。', 401);
  const tokens = await tokenResponse.json<Row>(); const claims = await verifyIdToken(String(tokens.id_token || ''), row.nonce, doc);
  const email = normalizeEmail(claims.email || claims.upn || claims.preferred_username); if (!email || claims.email_verified === false) throw new ApiError('教育雲端帳號未提供已驗證電子郵件。', 403);
  const roleText = String(claims[cf().EDU_OIDC_ROLE_CLAIM || 'role'] || claims.roles || '').toLowerCase();
  const role = studentProfile(email) ? 'student' : (/teacher|教師|教職/.test(roleText) ? 'teacher' : 'application');
  const result = await createChallenge(request, email, `education:${role}`);
  const app = new URL('/app.html', new URL(request.url).origin); app.searchParams.set('education', 'verify'); app.searchParams.set('challenge', result.challengeId); app.searchParams.set('mode', role === 'application' ? 'application' : 'login');
  return Response.redirect(app, 302);
}

async function handle(request: Request) {
  try {
    const url = new URL(request.url), path = url.pathname, method = request.method.toUpperCase();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin && origin !== cf().PUBLIC_ORIGIN) throw new ApiError('來源驗證失敗。', 403);
    }
    if (method === 'GET' && path === '/api/health') {
      return json({ ok: true, database: Boolean(cf().DB), email: Boolean(cf().EMAIL_API_URL && cf().EMAIL_API_KEY && cf().EMAIL_FROM), educationOidc: oidcEnabled(), privacyVersion: PRIVACY_VERSION });
    }
    if (method === 'GET' && path === '/api/auth/education/status') return json({ enabled: oidcEnabled(), provider: '教育雲端帳號' });
    if (method === 'GET' && path === '/api/auth/local/status') {
      const developerEmail = normalizeEmail(cf().DEVELOPER_EMAIL); let configured = false;
      if (developerEmail) { const user = await findUser(developerEmail); if (user) configured = Boolean(await cf().DB.prepare('SELECT user_id FROM credentials c JOIN totp_enrollments t USING(user_id) WHERE c.user_id=? AND t.enabled=1').bind(user.id).first()); }
      return json({ enabled: true, developerConfigured: configured, methods: ['password', 'invitation', 'totp'] });
    }
    if (method === 'POST' && path === '/api/auth/developer/setup/start') {
      const data = await body(request), email = normalizeEmail(data.email), setupToken = String(data.setupToken || '');
      if (email !== normalizeEmail(cf().DEVELOPER_EMAIL) || !cf().DEVELOPER_SETUP_TOKEN || !(await safeEqual(setupToken, cf().DEVELOPER_SETUP_TOKEN!))) throw new ApiError('開發者初始設定碼不正確。', 401);
      await rateLimit(`developer-setup:${await ipDigest(request)}`, 5, 15 * 60);
      let user = await findUser(email); const timestamp = now();
      if (user && await cf().DB.prepare('SELECT user_id FROM totp_enrollments WHERE user_id=? AND enabled=1').bind(user.id).first()) throw new ApiError('開發者動態驗證器已完成設定。', 409);
      if (!user) { const id = uuid(); await cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,'developer','active',?,?)").bind(id, await emailLookup(email), await seal(email), timestamp, timestamp).run(); user = await findUser(email); }
      else await cf().DB.prepare("UPDATE users SET role='developer',status='active',updated_at=? WHERE id=?").bind(timestamp, user.id).run();
      const salt = randomToken(24), secretBytes = new Uint8Array(20); crypto.getRandomValues(secretBytes); const secret = base32Encode(secretBytes);
      await cf().DB.prepare('INSERT INTO credentials(user_id,password_salt,password_digest,failed_attempts,created_at,updated_at) VALUES(?,?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET password_salt=excluded.password_salt,password_digest=excluded.password_digest,failed_attempts=0,locked_until=NULL,updated_at=excluded.updated_at').bind(user!.id, salt, await passwordDigest(String(data.password || ''), salt), timestamp, timestamp).run();
      await cf().DB.prepare('INSERT INTO totp_enrollments(user_id,secret_cipher,enabled,created_at,updated_at) VALUES(?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET secret_cipher=excluded.secret_cipher,enabled=0,last_counter=NULL,updated_at=excluded.updated_at').bind(user!.id, await seal(secret), timestamp, timestamp).run();
      const uri = `otpauth://totp/${encodeURIComponent(`數學任務站:${email}`)}?secret=${secret}&issuer=${encodeURIComponent('數學任務站')}&digits=6&period=30`;
      return json({ manualKey: secret, otpauthUri: uri });
    }
    if (method === 'POST' && path === '/api/auth/developer/setup/confirm') {
      const data = await body(request), email = normalizeEmail(data.email), setupToken = String(data.setupToken || '');
      if (email !== normalizeEmail(cf().DEVELOPER_EMAIL) || !cf().DEVELOPER_SETUP_TOKEN || !(await safeEqual(setupToken, cf().DEVELOPER_SETUP_TOKEN!))) throw new ApiError('開發者初始設定碼不正確。', 401);
      const user = await findUser(email); if (!user) throw new ApiError('請先開始開發者設定。', 409);
      const enrollment = await cf().DB.prepare('SELECT * FROM totp_enrollments WHERE user_id=?').bind(user.id).first<Row>(); if (!enrollment) throw new ApiError('請先開始開發者設定。', 409);
      const counter = await verifyTotp(await unseal(enrollment.secret_cipher), data.otp, enrollment.last_counter); if (counter == null) throw new ApiError('動態驗證碼不正確。', 401);
      await cf().DB.prepare('UPDATE totp_enrollments SET enabled=1,last_counter=?,updated_at=? WHERE user_id=?').bind(counter, now(), user.id).run(); await acknowledge(user.id, data.privacyVersion);
      const session = await createSession(request, user); await audit(user.id, 'auth.developer_totp_enrolled'); return json({ user: session.user, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
    }
    if (method === 'POST' && path === '/api/auth/password-login') {
      const data = await body(request), email = normalizeEmail(data.email), user = await findUser(email); await rateLimit(`password-login:${await ipDigest(request)}`, 20, 15 * 60);
      if (!user || user.status !== 'active') throw new ApiError('帳號、密碼或動態驗證碼不正確。', 401);
      const credential = await cf().DB.prepare('SELECT * FROM credentials WHERE user_id=?').bind(user.id).first<Row>();
      if (!credential || (credential.locked_until && Date.parse(credential.locked_until) > Date.now())) throw new ApiError('帳號暫時無法登入，請稍後再試。', 423);
      const matches = await safeEqual(credential.password_digest, await passwordDigest(String(data.password || ''), credential.password_salt));
      if (!matches) { const failures = Number(credential.failed_attempts) + 1, locked = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null; await cf().DB.prepare('UPDATE credentials SET failed_attempts=?,locked_until=?,updated_at=? WHERE user_id=?').bind(failures, locked, now(), user.id).run(); throw new ApiError('帳號、密碼或動態驗證碼不正確。', 401); }
      if (user.role === 'developer') { const enrollment = await cf().DB.prepare('SELECT * FROM totp_enrollments WHERE user_id=? AND enabled=1').bind(user.id).first<Row>(); if (!enrollment) throw new ApiError('開發者尚未完成動態驗證器設定。', 409); const counter = await verifyTotp(await unseal(enrollment.secret_cipher), data.otp, enrollment.last_counter); if (counter == null) throw new ApiError('帳號、密碼或動態驗證碼不正確。', 401); await cf().DB.prepare('UPDATE totp_enrollments SET last_counter=?,updated_at=? WHERE user_id=?').bind(counter, now(), user.id).run(); }
      await cf().DB.prepare('UPDATE credentials SET failed_attempts=0,locked_until=NULL,updated_at=? WHERE user_id=?').bind(now(), user.id).run(); await acknowledge(user.id, data.privacyVersion); const session = await createSession(request, user); await audit(user.id, 'auth.password_login');
      return json({ user: session.user, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
    }
    if (method === 'POST' && path === '/api/auth/invitation/register') {
      const data = await body(request), email = normalizeEmail(data.email), code = String(data.invitationCode || '').toUpperCase().replace(/\s/g, ''); if (data.privacyVersion !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
      await rateLimit(`invitation:${await ipDigest(request)}`, 20, 15 * 60); const invitation = await cf().DB.prepare('SELECT * FROM invitation_codes WHERE code_digest=?').bind(await hmac(`invite:${code}`)).first<Row>();
      if (!invitation || Number(invitation.uses_remaining) < 1 || Date.parse(invitation.expires_at) <= Date.now() || (invitation.email_lookup && invitation.email_lookup !== await emailLookup(email))) throw new ApiError('一次性啟用碼錯誤或已失效。', 401);
      const profile = invitation.role === 'student' ? studentProfile(email) : null, targetClass = invitation.class_id ? await cf().DB.prepare('SELECT * FROM classes WHERE id=?').bind(invitation.class_id).first<Row>() : null, customStudent = invitation.role === 'student' && !profile && targetClass && Number(targetClass.class_number) === 0 && Boolean(invitation.email_lookup);
      if (invitation.role === 'student' && !profile && !customStudent) throw new ApiError('校內學生須使用龍門國中信箱；個人帳號須使用綁定信箱的自訂班級啟用碼。', 403);
      if (profile && invitation.class_id && invitation.class_id !== profile.code && invitation.class_id !== `test-${profile.code}`) throw new ApiError('此啟用碼不屬於您的班級。', 403);
      let user = await findUser(email); const timestamp = now(), userId = user?.id || uuid(), salt = randomToken(24), digestValue = await passwordDigest(String(data.password || ''), salt), statements = [cf().DB.prepare('UPDATE invitation_codes SET uses_remaining=uses_remaining-1 WHERE id=? AND uses_remaining>0').bind(invitation.id)];
      const assignedGrade = profile?.grade ?? targetClass?.grade ?? null, assignedClassNumber = profile?.classNumber ?? targetClass?.class_number ?? null;
      if (!user) statements.push(cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,grade,class_number,seat_number,created_at,updated_at) VALUES(?,?,?,?, 'active',?,?,?,?,?)").bind(userId, await emailLookup(email), await seal(email), invitation.role, assignedGrade, assignedClassNumber, profile?.seatNumber ?? null, timestamp, timestamp));
      else statements.push(cf().DB.prepare("UPDATE users SET role=?,status='active',grade=?,class_number=?,seat_number=?,updated_at=? WHERE id=?").bind(invitation.role, assignedGrade ?? user.grade, assignedClassNumber ?? user.class_number, profile?.seatNumber ?? user.seat_number, timestamp, userId));
      statements.push(cf().DB.prepare('INSERT INTO credentials(user_id,password_salt,password_digest,failed_attempts,created_at,updated_at) VALUES(?,?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET password_salt=excluded.password_salt,password_digest=excluded.password_digest,failed_attempts=0,locked_until=NULL,updated_at=excluded.updated_at').bind(userId, salt, digestValue, timestamp, timestamp));
      if (profile || customStudent) { const classId = invitation.class_id || profile!.code; if (profile && !targetClass) statements.push(cf().DB.prepare('INSERT INTO classes(id,code,grade,class_number,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(classId, profile.code, profile.grade, profile.classNumber, timestamp)); statements.push(cf().DB.prepare('DELETE FROM class_students WHERE student_id=?').bind(userId),cf().DB.prepare('INSERT INTO class_students(class_id,student_id,joined_at) VALUES(?,?,?)').bind(classId, userId, timestamp)); }
      const registered = await cf().DB.batch(statements); if (!registered[0].meta.changes) throw new ApiError('一次性啟用碼已被使用。', 409); user = await findUser(email);
      await acknowledge(user!.id, data.privacyVersion); const session = await createSession(request, user!); await audit(user!.id, 'auth.invitation_registered'); return json({ user: session.user, csrfToken: session.csrfToken }, 201, { 'set-cookie': sessionCookie(session.token) });
    }
    if (method === 'GET' && path === '/api/auth/education/start') return beginOidc(request, url);
    if (method === 'GET' && path === '/api/auth/education/callback') return finishOidc(request, url);

    if (method === 'POST' && path === '/api/auth/request-code') {
      const data = await body(request); const email = normalizeEmail(data.email);
      if (data.privacyVersion !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
      const user = await findUser(email), developer = normalizeEmail(cf().DEVELOPER_EMAIL);
      if (!studentProfile(email) && email !== developer && (!user || user.status !== 'active')) throw new ApiError('此信箱需先提出使用申請。', 403);
      return json(await createChallenge(request, email, 'login'), 201);
    }
    if (method === 'POST' && path === '/api/auth/verify-code') {
      const data = await body(request); const challenge = await consumeChallenge(request, data.challengeId, data.otp, 'login'); const email = challenge.email;
      if (normalizeEmail(email) === normalizeEmail(cf().DEVELOPER_EMAIL)) {
        const proof = randomToken(), id = uuid(); await cf().DB.prepare('INSERT INTO developer_login_proofs(id,email_lookup,proof_digest,expires_at,ip_digest) VALUES(?,?,?,?,?)').bind(id, challenge.email_lookup, await digest(proof), new Date(Date.now() + 5 * 60_000).toISOString(), await ipDigest(request)).run();
        return json({ requiresDeveloperPassword: true, developerProof: proof });
      }
      const user = studentProfile(email) ? await ensureStudent(email) : await findUser(email);
      if (!user || user.status !== 'active') throw new ApiError('帳號尚未核准。', 403);
      await acknowledge(user.id, data.privacyVersion); const session = await createSession(request, user);
      return json({ user: session.user, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
    }
    if (method === 'POST' && path === '/api/auth/developer-password') {
      const data = await body(request), proof = textValue(data.developerProof, 500), password = String(data.password || '');
      const row = await cf().DB.prepare('SELECT * FROM developer_login_proofs WHERE proof_digest=?').bind(await digest(proof)).first<Row>();
      if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now() || row.ip_digest !== await ipDigest(request)) throw new ApiError('開發者第二階段驗證已失效。', 401);
      await rateLimit(`developer:${row.email_lookup}`, 5, 15 * 60);
      if (!cf().DEVELOPER_PASSWORD || !(await safeEqual(password, cf().DEVELOPER_PASSWORD!))) throw new ApiError('開發者密碼錯誤。', 401);
      await cf().DB.prepare('UPDATE developer_login_proofs SET consumed_at=? WHERE id=?').bind(now(), row.id).run();
      const email = normalizeEmail(cf().DEVELOPER_EMAIL); if (!email) throw new ApiError('開發者帳號尚未設定。', 503);
      const lookup = await emailLookup(email), timestamp = now(); let user = await findUser(email);
      if (!user) { const id = uuid(); await cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,'developer','active',?,?)").bind(id, lookup, await seal(email), timestamp, timestamp).run(); user = await findUser(email); }
      if (user!.role !== 'developer') { await cf().DB.prepare("UPDATE users SET role='developer',status='active',updated_at=? WHERE id=?").bind(timestamp, user!.id).run(); user = await findUser(email); }
      await acknowledge(user!.id, data.privacyVersion); const session = await createSession(request, user!); await audit(user!.id, 'auth.developer_login');
      return json({ user: session.user, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
    }
    if (method === 'POST' && path === '/api/applications/request-code') {
      const data = await body(request); if (data.privacyVersion !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
      return json(await createChallenge(request, data.email, 'application'), 201);
    }
    if (method === 'POST' && path === '/api/applications/direct') {
      const data = await body(request), email = normalizeEmail(data.email); if (data.privacyVersion !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
      await rateLimit(`direct-application-ip:${await ipDigest(request)}`, 5, 60 * 60); const lookup = await emailLookup(email); await rateLimit(`direct-application-email:${lookup}`, 3, 24 * 60 * 60);
      const pending = await cf().DB.prepare("SELECT id FROM access_applications WHERE email_lookup=? AND status='pending'").bind(lookup).first<Row>(); if (pending) throw new ApiError('此信箱已有待審申請，請勿重複送出。', 409);
      const result = await makeApplication({ email_lookup: lookup, email_cipher: await seal(email) }, data, false); await audit(null, 'application.direct_submitted', 'application', result.id, 'success', { emailVerified: false }); return json({ ...result, notice: '申請已送出。信箱尚未驗證，開發者核對身分後才會發給一次性啟用碼。' }, 201);
    }
    if (method === 'POST' && path === '/api/applications/submit') {
      const data = await body(request); if (data.privacyVersion !== PRIVACY_VERSION) throw new ApiError('請先確認個人資料告知事項。');
      return json(await makeApplication(await consumeChallenge(request, data.challengeId, data.otp, 'application'), data), 201);
    }
    if (method === 'POST' && path === '/api/auth/education/verify-code') {
      const data = await body(request), challenge = await consumeChallenge(request, data.challengeId, data.otp, /^education:/);
      const role = String(challenge.purpose).split(':')[1];
      if (role === 'application') return json({ application: await makeApplication(challenge, data.application || {}) }, 201);
      let user = role === 'student' ? await ensureStudent(challenge.email) : await findUser(challenge.email); const timestamp = now();
      if (role === 'teacher' && !user) { const id = uuid(); await cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,'teacher','active',?,?)").bind(id, challenge.email_lookup, challenge.email_cipher, timestamp, timestamp).run(); user = await findUser(challenge.email); }
      if (!user || user.status !== 'active') throw new ApiError('教育帳號目前無法啟用。', 403);
      await acknowledge(user.id, data.privacyVersion); const session = await createSession(request, user);
      return json({ user: session.user, csrfToken: session.csrfToken }, 200, { 'set-cookie': sessionCookie(session.token) });
    }

    if (method === 'GET' && path === '/api/me') { const session = await authenticate(request); return json({ user: await publicUser(session) }); }
    if (method === 'GET' && path === '/api/auth/csrf') { const session = await authenticate(request); const csrf = randomToken(); await cf().DB.prepare('UPDATE sessions SET csrf_digest=? WHERE id=?').bind(await digest(csrf), session.id).run(); return json({ csrfToken: csrf }); }
    if (method === 'POST' && path === '/api/auth/logout') { const session = await authenticate(request); await requireCsrf(request, session); await cf().DB.prepare('DELETE FROM sessions WHERE id=?').bind(session.id).run(); return json({}, 204, { 'set-cookie': clearCookie() }); }

    if (method === 'GET' && path === '/api/classes') {
      const session = await authenticate(request, ['developer', 'teacher']);
      const query = session.role === 'developer' ? 'SELECT c.*,u.email_cipher AS teacher_email_cipher FROM classes c LEFT JOIN users u ON u.id=c.teacher_id ORDER BY c.code' : 'SELECT c.*,u.email_cipher AS teacher_email_cipher FROM classes c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=? ORDER BY c.code';
      const result = session.role === 'developer' ? await cf().DB.prepare(query).all<Row>() : await cf().DB.prepare(query).bind(session.user_id).all<Row>();
      const classes = await Promise.all(result.results.map(async row => ({ ...row, teacher_email: row.teacher_email_cipher ? await unseal(row.teacher_email_cipher) : null, teacher_email_cipher: undefined })));
      return json({ classes });
    }
    if (method === 'POST' && path === '/api/classes') {
      const session = await authenticate(request, ['developer']); await requireCsrf(request, session); const data = await body(request), code = textValue(data.code, 40).trim(), grade = Number(data.grade);
      if (!/^[\p{L}\p{N} _-]{2,40}$/u.test(code)) throw new ApiError('班級名稱限 2 至 40 個中英文字、數字、空格、底線或連字號。'); if (![7,8,9].includes(grade)) throw new ApiError('請選擇七、八或九年級程度。');
      const id = `custom-${uuid()}`; try { await cf().DB.prepare('INSERT INTO classes(id,code,grade,class_number,created_at) VALUES(?,?,?,0,?)').bind(id, code, grade, now()).run(); } catch { throw new ApiError('班級名稱已存在，請使用其他名稱。', 409); }
      await audit(session.user_id, 'class.custom_created', 'class', id, 'success', { code, grade }); return json({ id, code, grade, custom: true }, 201);
    }
    const classTeacher = path.match(/^\/api\/classes\/([^/]+)\/teacher$/);
    if (method === 'PATCH' && classTeacher) {
      const session = await authenticate(request, ['developer']); await requireCsrf(request, session); const data = await body(request), teacher = await findUser(normalizeEmail(data.teacherEmail));
      if (!teacher || teacher.role !== 'teacher' || teacher.status !== 'active') throw new ApiError('找不到已核准教師。', 404);
      const result = await cf().DB.prepare('UPDATE classes SET teacher_id=? WHERE id=?').bind(teacher.id, decodeURIComponent(classTeacher[1])).run(); if (!result.meta.changes) throw new ApiError('找不到班級。', 404);
      await audit(session.user_id, 'class.teacher_assigned', 'class', classTeacher[1]); return json({ ok: true });
    }
    if (method === 'GET' && path === '/api/teachers') {
      await authenticate(request, ['developer']); const result = await cf().DB.prepare("SELECT id,email_cipher FROM users WHERE role='teacher' AND status='active' ORDER BY created_at").all<Row>();
      return json({ teachers: await Promise.all(result.results.map(async row => ({ id: row.id, email: await unseal(row.email_cipher) }))) });
    }
    if (method === 'GET' && path === '/api/invitations') {
      const session = await authenticate(request, ['developer', 'teacher']); const rows = session.role === 'developer'
        ? await cf().DB.prepare('SELECT id,role,class_id,email_lookup,uses_remaining,expires_at,created_at FROM invitation_codes ORDER BY created_at DESC LIMIT 500').all<Row>()
        : await cf().DB.prepare('SELECT id,role,class_id,email_lookup,uses_remaining,expires_at,created_at FROM invitation_codes WHERE created_by=? ORDER BY created_at DESC LIMIT 500').bind(session.user_id).all<Row>();
      return json({ invitations: rows.results.map(row => ({ ...row, emailBound: Boolean(row.email_lookup), email_lookup: undefined })) });
    }
    if (method === 'POST' && path === '/api/invitations') {
      const session = await authenticate(request, ['developer', 'teacher']); await requireCsrf(request, session); const data = await body(request), role = data.role === 'teacher' ? 'teacher' : 'student', count = Math.min(40, Math.max(1, Number(data.count) || 1)), days = Math.min(30, Math.max(1, Number(data.expiresInDays) || 7));
      if (session.role === 'teacher' && role !== 'student') throw new ApiError('教師只能替自己任教班級產生學生啟用碼。', 403);
      const classId = role === 'student' ? textValue(data.classId, 80) : null, targetClass = classId ? await cf().DB.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first<Row>() : null; if (classId && !targetClass) throw new ApiError('找不到指定班級。', 404);
      if (session.role === 'teacher' && (!classId || !(await cf().DB.prepare('SELECT id FROM classes WHERE id=? AND teacher_id=?').bind(classId, session.user_id).first()))) throw new ApiError('您只能替自己任教的班級產生啟用碼。', 403);
      const boundEmail = normalizeEmail(data.email), boundLookup = boundEmail ? await emailLookup(boundEmail) : null; if (role === 'teacher' && !boundEmail) throw new ApiError('教師啟用碼必須綁定教師信箱。');
      if (role === 'student' && Number(targetClass?.class_number) === 0 && !boundEmail) throw new ApiError('自訂班級的學生啟用碼必須綁定申請者信箱。');
      const expiresAt = new Date(Date.now() + days * 86400_000).toISOString(), codes: string[] = [], invitationIds: string[] = [];
      for (let index = 0; index < count; index++) { const code = inviteCode(), id = uuid(); await cf().DB.prepare('INSERT INTO invitation_codes(id,code_digest,role,class_id,email_lookup,uses_remaining,expires_at,created_by,created_at) VALUES(?,?,?,?,?,1,?,?,?)').bind(id, await hmac(`invite:${code.replace(/\s/g, '')}`), role, classId, boundLookup, expiresAt, session.user_id, now()).run(); codes.push(code); invitationIds.push(id); }
      await audit(session.user_id, 'invitation.created', 'invitation_batch', '', 'success', { role, classId, count }); return json({ codes, invitationIds, role, classId, expiresAt, notice: '啟用碼只顯示這一次，請安全交付。' }, 201);
    }
    const invitationId = path.match(/^\/api\/invitations\/([^/]+)$/);
    if (method === 'DELETE' && invitationId) {
      const session = await authenticate(request, ['developer', 'teacher']); await requireCsrf(request, session); const id = decodeURIComponent(invitationId[1]);
      const statement = session.role === 'developer' ? cf().DB.prepare('UPDATE invitation_codes SET uses_remaining=0 WHERE id=? AND uses_remaining>0').bind(id) : cf().DB.prepare('UPDATE invitation_codes SET uses_remaining=0 WHERE id=? AND created_by=? AND uses_remaining>0').bind(id, session.user_id);
      const result = await statement.run(); if (!result.meta.changes) throw new ApiError('找不到啟用碼、已失效或沒有權限。', 404);
      await audit(session.user_id, 'invitation.revoked', 'invitation', id); return json({ ok: true });
    }
    const classStudents = path.match(/^\/api\/classes\/([^/]+)\/students$/);
    if (method === 'GET' && classStudents) {
      const session = await authenticate(request, ['developer', 'teacher']), classId = decodeURIComponent(classStudents[1]);
      if (session.role === 'teacher') { const owned = await cf().DB.prepare('SELECT id FROM classes WHERE id=? AND teacher_id=?').bind(classId, session.user_id).first(); if (!owned) throw new ApiError('您不能查看其他班級學生。', 403); }
      const rows = await cf().DB.prepare('SELECT u.id,u.email_cipher,u.seat_number FROM users u JOIN class_students cs ON cs.student_id=u.id WHERE cs.class_id=? ORDER BY u.seat_number').bind(classId).all<Row>();
      return json({ students: await Promise.all(rows.results.map(async row => ({ id: row.id, email: await unseal(row.email_cipher), seat_number: row.seat_number }))) });
    }
    const studentClass = path.match(/^\/api\/students\/([^/]+)\/class$/);
    if (method === 'PATCH' && studentClass) {
      const session = await authenticate(request, ['developer']); await requireCsrf(request, session); const data = await body(request), studentId = decodeURIComponent(studentClass[1]), classId = textValue(data.classId, 80);
      const student = await cf().DB.prepare("SELECT id,grade FROM users WHERE id=? AND role='student' AND status='active'").bind(studentId).first<Row>(); if (!student) throw new ApiError('找不到可移動的學生帳號。', 404);
      const target = await cf().DB.prepare('SELECT id,grade,class_number FROM classes WHERE id=?').bind(classId).first<Row>(); if (!target) throw new ApiError('找不到目標班級。', 404);
      if (Number(student.grade) !== Number(target.grade)) throw new ApiError('學生只能移動到相同年級的班級。', 400);
      await cf().DB.batch([cf().DB.prepare('DELETE FROM class_students WHERE student_id=?').bind(studentId),cf().DB.prepare('INSERT INTO class_students(class_id,student_id,joined_at) VALUES(?,?,?)').bind(classId,studentId,now()),cf().DB.prepare('UPDATE users SET class_number=?,updated_at=? WHERE id=?').bind(target.class_number,now(),studentId)]);
      await audit(session.user_id, 'class.student_moved', 'student', studentId, 'success', { classId }); return json({ ok: true, studentId, classId });
    }

    if (method === 'GET' && path === '/api/applications') {
      await authenticate(request, ['developer']); const rows = await cf().DB.prepare('SELECT * FROM access_applications ORDER BY requested_at DESC LIMIT 500').all<Row>();
      return json({ applications: await Promise.all(rows.results.map(async row => ({ ...row, email: await unseal(row.email_cipher), identity: await unseal(row.identity_cipher), workplace: await unseal(row.workplace_cipher), job_title: await unseal(row.job_title_cipher), email_cipher: undefined, identity_cipher: undefined, workplace_cipher: undefined, job_title_cipher: undefined }))) });
    }
    const review = path.match(/^\/api\/applications\/([^/]+)\/(approve|reject)$/);
    if (method === 'POST' && review) {
      const session = await authenticate(request, ['developer']); await requireCsrf(request, session); const id = decodeURIComponent(review[1]), action = review[2], data = await body(request);
      const application = await cf().DB.prepare("SELECT * FROM access_applications WHERE id=? AND status='pending'").bind(id).first<Row>(); if (!application) throw new ApiError('找不到待審申請。', 404);
      if (action === 'reject') await cf().DB.prepare("UPDATE access_applications SET status='rejected',reviewed_at=?,reviewed_by=? WHERE id=?").bind(now(), session.user_id, id).run();
      else { const role: Role = data.role === 'teacher' ? 'teacher' : 'approved_user'; const timestamp = now(); let user = await cf().DB.prepare('SELECT * FROM users WHERE email_lookup=?').bind(application.email_lookup).first<Row>(); if (!user) { const userId = uuid(); await cf().DB.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,?,'active',?,?)").bind(userId, application.email_lookup, application.email_cipher, role, timestamp, timestamp).run(); } else await cf().DB.prepare("UPDATE users SET role=?,status='active',updated_at=? WHERE id=?").bind(role, timestamp, user.id).run(); await cf().DB.prepare("UPDATE access_applications SET status='approved',approved_role=?,reviewed_at=?,reviewed_by=? WHERE id=?").bind(role, timestamp, session.user_id, id).run(); }
      await audit(session.user_id, `application.${action}`, 'application', id); return json({ ok: true });
    }

    if (method === 'POST' && path === '/api/assignments') {
      const session = await authenticate(request, ['developer', 'teacher']); await requireCsrf(request, session); const data = await body(request), classId = textValue(data.classId, 80);
      const cls = await cf().DB.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first<Row>(); if (!cls || (session.role === 'teacher' && cls.teacher_id !== session.user_id)) throw new ApiError('您不能派送此班級作業。', 403);
      const count = Number(data.questionCount), level = ['easy', 'medium', 'hard'].includes(data.level) ? data.level : 'easy'; if (![10, 15, 20].includes(count)) throw new ApiError('題數必須為 10、15 或 20。');
      const id = uuid(), timestamp = now(); await cf().DB.prepare("INSERT INTO assignments(id,class_id,teacher_id,title,grade,unit,level,question_count,due_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'active',?,?)").bind(id, cls.id, session.user_id, textValue(data.title, 120), cls.grade, textValue(data.unit, 120), level, count, data.dueAt || null, timestamp, timestamp).run(); return json({ id }, 201);
    }
    const assignmentId = path.match(/^\/api\/assignments\/([^/]+)$/);
    if (method === 'PATCH' && assignmentId) {
      const session = await authenticate(request, ['developer', 'teacher']); await requireCsrf(request, session); const data = await body(request); if (data.status !== 'archived') throw new ApiError('狀態值不正確。');
      const id = decodeURIComponent(assignmentId[1]); const query = session.role === 'developer' ? "UPDATE assignments SET status='archived',updated_at=? WHERE id=?" : "UPDATE assignments SET status='archived',updated_at=? WHERE id=? AND teacher_id=?"; const result = session.role === 'developer' ? await cf().DB.prepare(query).bind(now(), id).run() : await cf().DB.prepare(query).bind(now(), id, session.user_id).run(); if (!result.meta.changes) throw new ApiError('找不到作業或沒有權限。', 404); return json({ ok: true });
    }
    if (method === 'GET' && path === '/api/assignments') {
      const session = await authenticate(request, ['developer', 'teacher', 'student']); let result;
      if (session.role === 'developer') result = await cf().DB.prepare('SELECT * FROM assignments ORDER BY created_at DESC LIMIT 500').all<Row>();
      else if (session.role === 'teacher') result = await cf().DB.prepare('SELECT * FROM assignments WHERE teacher_id=? ORDER BY created_at DESC').bind(session.user_id).all<Row>();
      else result = await cf().DB.prepare("SELECT a.* FROM assignments a JOIN class_students cs ON cs.class_id=a.class_id WHERE cs.student_id=? AND a.status='active' ORDER BY a.created_at DESC").bind(session.user_id).all<Row>();
      return json({ assignments: result.results });
    }

    if (method === 'POST' && path === '/api/reports') {
      const session = await authenticate(request, ['student']); await requireCsrf(request, session); const data = await body(request), total = Number(data.totalQuestions), correct = Number(data.firstCorrect), hints = Number(data.hintsUsed || 0);
      if (!Number.isInteger(total) || total < 1 || total > 100 || !Number.isInteger(correct) || correct < 0 || correct > total || !Number.isInteger(hints) || hints < 0 || hints > total) throw new ApiError('報告數據格式不正確。');
      const summary = JSON.stringify(data.unitSummary || {}), attempts = JSON.stringify(data.attempts || []); if (summary.length > 50_000 || attempts.length > 150_000) throw new ApiError('報告資料量過大。', 413);
      const id = uuid(), timestamp = now(), deleteAfter = new Date(Date.now() + REPORT_DAYS * 86400_000).toISOString();
      await cf().DB.prepare('INSERT INTO reports(id,student_id,assignment_id,grade,unit_summary_cipher,attempts_cipher,total_questions,first_correct,hints_used,created_at,delete_after) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id, session.user_id, null, Number(session.grade), await seal(summary), await seal(attempts), total, correct, hints, timestamp, deleteAfter).run(); return json({ id, deleteAfter }, 201);
    }
    const reportId = path.match(/^\/api\/reports\/([^/]+)$/);
    if (method === 'GET' && reportId) {
      const session = await authenticate(request, ['developer', 'teacher', 'student']), id = decodeURIComponent(reportId[1]); let report;
      if (session.role === 'developer') report = await cf().DB.prepare('SELECT * FROM reports WHERE id=?').bind(id).first<Row>();
      else if (session.role === 'student') report = await cf().DB.prepare('SELECT * FROM reports WHERE id=? AND student_id=?').bind(id, session.user_id).first<Row>();
      else report = await cf().DB.prepare('SELECT r.* FROM reports r JOIN class_students cs ON cs.student_id=r.student_id JOIN classes c ON c.id=cs.class_id WHERE r.id=? AND c.teacher_id=?').bind(id, session.user_id).first<Row>();
      if (!report) throw new ApiError('找不到報告或沒有權限。', 404); return json({ report: await decodeReport(report) });
    }
    if (method === 'GET' && path === '/api/reports') {
      const session = await authenticate(request, ['developer', 'teacher', 'student']); let rows;
      if (session.role === 'developer') rows = await cf().DB.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 2000').all<Row>();
      else if (session.role === 'student') rows = await cf().DB.prepare('SELECT * FROM reports WHERE student_id=? ORDER BY created_at DESC').bind(session.user_id).all<Row>();
      else rows = await cf().DB.prepare('SELECT DISTINCT r.* FROM reports r JOIN class_students cs ON cs.student_id=r.student_id JOIN classes c ON c.id=cs.class_id WHERE c.teacher_id=? ORDER BY r.created_at DESC').bind(session.user_id).all<Row>();
      return json({ reports: await Promise.all(rows.results.map(decodeReport)) });
    }
    if (method === 'POST' && path === '/api/privacy-requests') { const session = await authenticate(request); await requireCsrf(request, session); const data = await body(request); if (!['access', 'copy', 'correct', 'restrict', 'delete'].includes(data.requestType)) throw new ApiError('請選擇有效的個資權利請求。'); const id = uuid(); await cf().DB.prepare("INSERT INTO privacy_requests(id,user_id,request_type,status,requested_at) VALUES(?,?,?,'pending',?)").bind(id, session.user_id, data.requestType, now()).run(); return json({ id, status: 'pending' }, 201); }
    if (method === 'POST' && path === '/api/admin/purge') { const session = await authenticate(request, ['developer']); await requireCsrf(request, session); const expired = now(); const reports = await cf().DB.prepare('DELETE FROM reports WHERE delete_after<?').bind(expired).run(); const sessions = await cf().DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(expired).run(); return json({ reports: reports.meta.changes, sessions: sessions.meta.changes }); }
    throw new ApiError('找不到此功能。', 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error(error); return json({ error: '伺服器暫時無法處理，請稍後再試。' }, 500);
  }
}

async function decodeReport(row: Row) {
  return { ...row, unitSummary: JSON.parse(await unseal(row.unit_summary_cipher)), attempts: JSON.parse(await unseal(row.attempts_cipher)), unit_summary_cipher: undefined, attempts_cipher: undefined };
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
