import { randomUUID, createHash } from 'node:crypto';
import { db, now, transaction } from './db.mjs';
import { config } from './config.mjs';
import { encryptedEmail, emailLookup, hmac, normalizeEmail, protect, randomOtp, randomToken, revealEmail, safeEqual, seal, sha256, studentProfile, unprotect, unseal } from './security.mjs';
import { buildEducationAuthorizationUrl, exchangeEducationCode } from './education-oidc.mjs';

const json = value => JSON.stringify(value ?? {});
const parse = value => { try { return JSON.parse(value || '{}'); } catch { return {}; } };
const future = minutes => new Date(Date.now() + minutes * 60000).toISOString();

export function audit(actorId, action, targetType = '', targetId = '', outcome = 'success', metadata = {}) {
  const previous = db.prepare('SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1').get()?.entry_hash || 'GENESIS';
  const occurredAt = now();
  const clean = Object.fromEntries(Object.entries(metadata).filter(([key]) => !/token|otp|password|answer|email/i.test(key)));
  const payload = `${occurredAt}|${actorId || ''}|${action}|${targetType}|${targetId}|${outcome}|${json(clean)}|${previous}`;
  const entryHash = createHash('sha256').update(payload).digest('hex');
  db.prepare(`INSERT INTO audit_logs(occurred_at,actor_id,action,target_type,target_id,outcome,metadata_json,previous_hash,entry_hash)
              VALUES(?,?,?,?,?,?,?,?,?)`).run(occurredAt, actorId || null, action, targetType || null, targetId || null, outcome, json(clean), previous, entryHash);
}

export function rateLimit(bucket, maximum, windowSeconds) {
  const current = db.prepare('SELECT * FROM rate_limits WHERE bucket=?').get(bucket);
  const timestamp = Date.now();
  if (!current || Date.parse(current.reset_at) <= timestamp) {
    db.prepare(`INSERT INTO rate_limits(bucket,count,reset_at) VALUES(?,1,?)
                ON CONFLICT(bucket) DO UPDATE SET count=1,reset_at=excluded.reset_at`).run(bucket, new Date(timestamp + windowSeconds * 1000).toISOString());
    return;
  }
  if (current.count >= maximum) throw Object.assign(new Error('嘗試次數過多，請稍後再試。'), { status: 429 });
  db.prepare('UPDATE rate_limits SET count=count+1 WHERE bucket=?').run(bucket);
}

async function sendOtp(email, otp) {
  if (!config.emailApiUrl || !config.emailApiKey || !config.emailFrom) {
    throw Object.assign(new Error('電子郵件驗證服務尚未設定，請聯絡管理者。'), { status: 503 });
  }
  const response = await fetch(config.emailApiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.emailApiKey}` },
    body: json({ from: config.emailFrom, to: email, subject: '數學任務站登入驗證碼', text: `您的驗證碼是 ${otp}，${config.otpMinutes} 分鐘內有效。若非本人操作請忽略。` }),
  });
  if (!response.ok) throw Object.assign(new Error('驗證信寄送失敗，請稍後再試。'), { status: 503 });
}

async function createStoredChallenge(email, purpose, ipKey, contextId = null) {
  rateLimit(`otp:${sha256(email)}:${ipKey}`, 5, 3600);
  const id = randomUUID();
  const otp = randomOtp();
  const storedEmail = encryptedEmail(email);
  db.prepare('INSERT INTO auth_challenges(id,email,email_cipher,otp_digest,purpose,expires_at,created_at,context_id) VALUES(?,?,?,?,?,?,?,?)')
    .run(id, storedEmail.lookup, storedEmail.cipher, hmac(`${id}:${otp}`), purpose, future(config.otpMinutes), now(), contextId);
  try {
    await sendOtp(email, otp);
  } catch (error) {
    db.prepare('DELETE FROM auth_challenges WHERE id=?').run(id);
    throw error;
  }
  audit(null, 'auth.challenge.created', 'challenge', id, 'success', { purpose });
  return { challengeId: id, expiresInSeconds: config.otpMinutes * 60 };
}

export async function createChallenge(emailValue, purpose, ipKey) {
  const email = normalizeEmail(emailValue);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw Object.assign(new Error('電子郵件格式不正確。'), { status: 400 });
  if (!['login', 'application'].includes(purpose)) throw Object.assign(new Error('驗證用途不正確。'), { status: 400 });
  if (purpose === 'login') {
    const user = db.prepare("SELECT status FROM users WHERE email=?").get(emailLookup(email));
    if (!studentProfile(email) && email !== config.developerEmail && user?.status !== 'active') {
      throw Object.assign(new Error('此帳號尚未核准，請先提出使用申請。'), { status: 403 });
    }
  }
  return createStoredChallenge(email, purpose, ipKey);
}

export function consumeChallengeRecord(challengeId, otp, purpose) {
  const row = db.prepare('SELECT * FROM auth_challenges WHERE id=?').get(challengeId);
  if (!row || row.purpose !== purpose || row.consumed_at || Date.parse(row.expires_at) < Date.now()) throw Object.assign(new Error('驗證碼已失效，請重新取得。'), { status: 400 });
  if (row.attempts >= 5) throw Object.assign(new Error('驗證次數過多，請重新取得驗證碼。'), { status: 429 });
  if (!safeEqual(row.otp_digest, hmac(`${challengeId}:${String(otp || '')}`))) {
    const changed = db.prepare(`UPDATE auth_challenges SET attempts=attempts+1
      WHERE id=? AND consumed_at IS NULL AND attempts<5 AND expires_at>?`).run(challengeId, now()).changes;
    if (!changed) throw Object.assign(new Error('驗證次數過多，請重新取得驗證碼。'), { status: 429 });
    const attempts = db.prepare('SELECT attempts FROM auth_challenges WHERE id=?').get(challengeId)?.attempts || 5;
    throw Object.assign(new Error(attempts >= 5 ? '驗證次數過多，請重新取得驗證碼。' : '驗證碼不正確。'), { status: attempts >= 5 ? 429 : 401 });
  }
  return transaction(() => {
    const current = db.prepare('SELECT * FROM auth_challenges WHERE id=?').get(challengeId);
    if (!current || current.consumed_at || current.attempts >= 5 || Date.parse(current.expires_at) < Date.now()) throw Object.assign(new Error('驗證碼已失效，請重新取得。'), { status: 400 });
    db.prepare('UPDATE auth_challenges SET attempts=attempts+1,consumed_at=? WHERE id=?').run(now(), challengeId);
    return current;
  });
}
export function consumeChallenge(challengeId, otp, purpose) { return revealEmail(consumeChallengeRecord(challengeId, otp, purpose)); }

export async function beginEducationLogin(ipDigest) {
  if (!config.educationOidc.enabled) throw Object.assign(new Error('教育雲端帳號介接尚未啟用。'), { status: 503 });
  rateLimit(`education-start:${ipDigest}`, 20, 3600);
  const id = randomUUID();
  const state = randomToken(32);
  const nonce = randomToken(32);
  const codeVerifier = randomToken(48);
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  db.prepare(`INSERT INTO education_oidc_states
    (id,state_digest,nonce_digest,nonce_cipher,code_verifier_cipher,expires_at,created_at,ip_digest)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(id, sha256(state), sha256(nonce), seal(nonce), seal(codeVerifier), future(10), now(), ipDigest);
  const authorizationUrl = await buildEducationAuthorizationUrl({ state, nonce, codeChallenge });
  audit(null, 'education_oidc.started', 'oidc_state', id);
  return { authorizationUrl };
}

export async function finishEducationLogin(stateValue, codeValue, ipDigest) {
  const state = String(stateValue || '');
  const code = String(codeValue || '');
  if (state.length < 20 || state.length > 500 || code.length < 3 || code.length > 4000) throw Object.assign(new Error('教育雲端登入回傳資料不完整。'), { status: 400 });
  const flow = transaction(() => {
    const row = db.prepare('SELECT * FROM education_oidc_states WHERE state_digest=?').get(sha256(state));
    if (!row || row.consumed_at || Date.parse(row.expires_at) < Date.now()) throw Object.assign(new Error('教育雲端登入流程已失效，請重新開始。'), { status: 400 });
    db.prepare('UPDATE education_oidc_states SET consumed_at=? WHERE id=?').run(now(), row.id);
    return row;
  });
  const nonce = unseal(flow.nonce_cipher);
  if (!safeEqual(flow.nonce_digest, sha256(nonce))) throw Object.assign(new Error('教育雲端登入流程驗證失敗。'), { status: 400 });
  const identity = await exchangeEducationCode({ code, codeVerifier: unseal(flow.code_verifier_cipher), nonce });
  const contextId = randomUUID();
  const storedEmail = encryptedEmail(identity.email);
  db.prepare(`INSERT INTO education_pending_identities
    (id,issuer,subject,email,email_cipher,display_name,organization,resolved_role,expires_at,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(contextId, identity.issuer, identity.subject, storedEmail.lookup, storedEmail.cipher, protect(identity.displayName || ''), protect(identity.organization || ''), identity.role, future(config.otpMinutes), now());
  const challenge = await createStoredChallenge(identity.email, 'education_oidc', ipDigest, contextId);
  audit(null, 'education_oidc.identity_verified', 'education_identity', contextId, 'success', { resolvedRole: identity.role || 'application' });
  return { ...challenge, mode: identity.role ? 'login' : 'application' };
}

function educationUser(identity, role) {
  const timestamp = now();
  const byExternal = db.prepare('SELECT * FROM users WHERE external_issuer=? AND external_subject=?').get(identity.issuer, identity.subject);
  const storedEmail = encryptedEmail(identity.email);
  const byEmail = db.prepare('SELECT * FROM users WHERE email=?').get(storedEmail.lookup);
  if (byExternal && byEmail && byExternal.id !== byEmail.id) throw Object.assign(new Error('教育雲端身分與既有帳號衝突，請由開發者協助處理。'), { status: 409 });
  if (byEmail?.external_subject && (!safeEqual(byEmail.external_issuer, identity.issuer) || !safeEqual(byEmail.external_subject, identity.subject))) {
    throw Object.assign(new Error('此信箱已綁定其他教育雲端身分，請由開發者協助處理。'), { status: 409 });
  }
  const existing = byExternal || byEmail;
  const id = existing?.id || randomUUID();
  if (existing) {
    db.prepare(`UPDATE users SET email=?,email_cipher=?,role=?,status='active',auth_provider='education_oidc',external_issuer=?,external_subject=?,
      display_name=?,organization=?,updated_at=?,last_login_at=? WHERE id=?`)
      .run(storedEmail.lookup, storedEmail.cipher, role, identity.issuer, identity.subject, protect(identity.display_name || ''), protect(identity.organization || ''), timestamp, timestamp, id);
  } else {
    db.prepare(`INSERT INTO users
      (id,email,email_cipher,role,status,auth_provider,external_issuer,external_subject,display_name,organization,created_at,updated_at,last_login_at)
      VALUES(?,?,?,?,'active','education_oidc',?,?,?,?,?,?,?)`)
      .run(id, storedEmail.lookup, storedEmail.cipher, role, identity.issuer, identity.subject, protect(identity.display_name || ''), protect(identity.organization || ''), timestamp, timestamp, timestamp);
  }
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}

export function completeEducationLogin(challengeId, otp, application, ipDigest, userAgentDigest) {
  const challenge = consumeChallengeRecord(challengeId, otp, 'education_oidc');
  const identity = transaction(() => {
    const row = db.prepare('SELECT * FROM education_pending_identities WHERE id=?').get(challenge.context_id);
    if (!row || row.consumed_at || Date.parse(row.expires_at) < Date.now()) throw Object.assign(new Error('教育雲端身分確認已失效，請重新登入。'), { status: 400 });
    db.prepare('UPDATE education_pending_identities SET consumed_at=? WHERE id=?').run(now(), row.id);
    return { ...row, email: revealEmail(row), display_name: row.display_name ? unprotect(row.display_name) : '', organization: row.organization ? unprotect(row.organization) : '' };
  });
  let role = identity.resolved_role;
  const approved = db.prepare("SELECT * FROM users WHERE email=? AND status='active'").get(emailLookup(identity.email));
  if (!role && approved && ['teacher','approved_user','student'].includes(approved.role)) role = approved.role;
  if (role) {
    let user;
    const profile = role === 'student' ? studentProfile(identity.email) : null;
    if (profile) {
      user = ensureStudent(identity.email, profile);
      db.prepare(`UPDATE users SET auth_provider='education_oidc',external_issuer=?,external_subject=?,display_name=?,organization=?,updated_at=? WHERE id=?`)
        .run(identity.issuer, identity.subject, protect(identity.display_name || ''), protect(identity.organization || ''), now(), user.id);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    } else user = educationUser(identity, role);
    return createSession(user, ipDigest, userAgentDigest);
  }
  const data = application || {};
  const pending = db.prepare("SELECT id FROM access_applications WHERE email=? AND status='pending'").get(emailLookup(identity.email));
  if (pending) return { application: { id: pending.id, status: 'pending' } };
  const id = randomUUID();
  const storedEmail = encryptedEmail(identity.email);
  db.prepare(`INSERT INTO access_applications
    (id,email,email_cipher,identity,workplace,job_title,status,requested_at,source,external_issuer,external_subject)
    VALUES(?,?,?,?,?,?,'pending',?,'education_oidc',?,?)`)
    .run(id, storedEmail.lookup, storedEmail.cipher, protect(validateApplicationText(data.identity, 80)), protect(validateApplicationText(data.workplace, 120)), protect(validateApplicationText(data.jobTitle, 120)), now(), identity.issuer, identity.subject);
  audit(null, 'application.submitted', 'application', id, 'success', { source: 'education_oidc' });
  return { application: { id, status: 'pending' } };
}

function validateApplicationText(value, maximum) {
  const text = String(value || '').trim();
  if (!text || text.length > maximum) throw Object.assign(new Error('請完整填寫身分、服務單位與工作職稱。'), { status: 400 });
  return text;
}

function ensureStudent(email, profile) {
  const timestamp = now();
  const storedEmail = encryptedEmail(email);
  const id = db.prepare('SELECT id FROM users WHERE email=?').get(storedEmail.lookup)?.id || randomUUID();
  db.prepare(`INSERT INTO users(id,email,email_cipher,role,status,admission_year,grade,class_number,seat_number,created_at,updated_at,last_login_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET email_cipher=excluded.email_cipher,status='active',last_login_at=excluded.last_login_at,updated_at=excluded.updated_at`)
    .run(id, storedEmail.lookup, storedEmail.cipher, 'student', 'active', profile.admissionYear, profile.grade, profile.classNumber, profile.seatNumber, timestamp, timestamp, timestamp);
  const classId = `lmjh-${profile.classCode}`;
  db.prepare(`INSERT INTO classes(id,code,grade,class_number,admission_year,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
              ON CONFLICT(code) DO UPDATE SET updated_at=excluded.updated_at`).run(classId, profile.classCode, profile.grade, profile.classNumber, profile.admissionYear, timestamp, timestamp);
  db.prepare(`INSERT INTO class_students(class_id,student_id,seat_number) VALUES(?,?,?)
              ON CONFLICT(class_id,student_id) DO UPDATE SET seat_number=excluded.seat_number`).run(classId, id, profile.seatNumber);
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}

function createSession(user, ipDigest, userAgentDigest) {
  const token = randomToken(); const csrf = randomToken(); const sessionId = randomUUID();
  db.prepare('INSERT INTO sessions(id,user_id,token_digest,csrf_digest,expires_at,created_at,last_seen_at,ip_digest,user_agent_digest) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(sessionId, user.id, sha256(token), sha256(csrf), future(config.sessionMinutes), now(), now(), ipDigest, userAgentDigest);
  audit(user.id, 'auth.login', 'session', sessionId);
  return { token, csrf, user: publicUser(user) };
}

export function login(challengeId, otp, ipDigest, userAgentDigest) {
  const email = consumeChallenge(challengeId, otp, 'login');
  if (email === config.developerEmail) {
    if (!config.developerPassword) throw Object.assign(new Error('開發者密碼尚未設定，請聯絡系統管理者。'), { status: 503 });
    const proof=randomToken(),id=randomUUID();
    const storedEmail = encryptedEmail(email);
    db.prepare('INSERT INTO developer_login_proofs(id,email,email_cipher,proof_digest,expires_at,created_at) VALUES(?,?,?,?,?,?)')
      .run(id,storedEmail.lookup,storedEmail.cipher,sha256(proof),future(5),now());
    audit(null,'auth.developer_email_verified','developer_proof',id);
    return { requiresDeveloperPassword:true, developerProof:proof, expiresInSeconds:300 };
  }
  const profile = studentProfile(email);
  let user;
  if (profile) user = ensureStudent(email, profile);
  else user = db.prepare("SELECT * FROM users WHERE email=? AND status='active'").get(emailLookup(email));
  if (!user) throw Object.assign(new Error('帳號尚未核准。'), { status: 403 });
  return createSession(user,ipDigest,userAgentDigest);
}

export function completeDeveloperLogin(proof, password, ipDigest, userAgentDigest) {
  rateLimit(`developer-password:${ipDigest}`,5,900);
  const row=db.prepare('SELECT * FROM developer_login_proofs WHERE proof_digest=?').get(sha256(proof||''));
  if(!row||row.consumed_at||Date.parse(row.expires_at)<Date.now())throw Object.assign(new Error('開發者驗證已失效，請重新驗證電子郵件。'),{status:401});
  if(row.attempts>=5)throw Object.assign(new Error('密碼錯誤次數過多，請重新驗證電子郵件。'),{status:429});
  db.prepare('UPDATE developer_login_proofs SET attempts=attempts+1 WHERE id=?').run(row.id);
  if(!config.developerPassword||!safeEqual(sha256(password||''),sha256(config.developerPassword)))throw Object.assign(new Error('開發者密碼不正確。'),{status:401});
  db.prepare('UPDATE developer_login_proofs SET consumed_at=? WHERE id=?').run(now(),row.id);
  const email=revealEmail(row),storedEmail=encryptedEmail(email),timestamp=now(),id=db.prepare('SELECT id FROM users WHERE email=?').get(storedEmail.lookup)?.id||randomUUID();
  db.prepare(`INSERT INTO users(id,email,email_cipher,role,status,created_at,updated_at,last_login_at) VALUES(?,?,?,?,'active',?,?,?)
              ON CONFLICT(email) DO UPDATE SET email_cipher=excluded.email_cipher,role='developer',status='active',updated_at=excluded.updated_at,last_login_at=excluded.last_login_at`)
    .run(id,storedEmail.lookup,storedEmail.cipher,'developer',timestamp,timestamp,timestamp);
  audit(id,'auth.developer_password_verified','developer_proof',row.id);
  return createSession(db.prepare('SELECT * FROM users WHERE id=?').get(id),ipDigest,userAgentDigest);
}

export function authenticate(token) {
  if (!token) return null;
  const row = db.prepare(`SELECT s.*,u.email,u.email_cipher,u.role,u.status,u.grade,u.class_number,u.seat_number
                          FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_digest=?`).get(sha256(token));
  if (!row || row.status !== 'active' || Date.parse(row.expires_at) < Date.now()) return null;
  db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(now(), row.id);
  return row;
}

export function verifyCsrf(session, value) {
  if (!value || !safeEqual(session.csrf_digest, sha256(value))) throw Object.assign(new Error('安全驗證失敗，請重新登入。'), { status: 403 });
}

export function logout(session) { db.prepare('DELETE FROM sessions WHERE id=?').run(session.id); audit(session.user_id, 'auth.logout', 'session', session.id); }
export const publicUser = user => ({ id: user.id, email: revealEmail(user), role: user.role, grade: user.grade ?? null, classNumber: user.class_number ?? null, seatNumber: user.seat_number ?? null });
const parseSensitive = (value, fallback) => {
  try { return JSON.parse(String(value || '').startsWith('v1.') ? unprotect(value) : (value || JSON.stringify(fallback))); }
  catch { return fallback; }
};
export const decodeReport = row => ({ ...row, unitSummary: parseSensitive(row.unit_summary_json, {}), attempts: parseSensitive(row.attempts_json, []), unit_summary_json: undefined, attempts_json: undefined });

export function purgeExpired() {
  const timestamp = now();
  const sessions = db.prepare('DELETE FROM sessions WHERE expires_at<?').run(timestamp).changes;
  const challenges = db.prepare('DELETE FROM auth_challenges WHERE expires_at<?').run(timestamp).changes;
  db.prepare('DELETE FROM developer_login_proofs WHERE expires_at<?').run(timestamp);
  db.prepare('DELETE FROM education_oidc_states WHERE expires_at<?').run(timestamp);
  db.prepare('DELETE FROM education_pending_identities WHERE expires_at<?').run(timestamp);
  const reports = db.prepare('DELETE FROM reports WHERE delete_after<?').run(timestamp).changes;
  const auditCutoff = new Date(Date.now() - config.auditRetentionDays * 86400000).toISOString();
  const logs = db.prepare('DELETE FROM audit_logs WHERE occurred_at<?').run(auditCutoff).changes;
  return { sessions, challenges, reports, logs };
}
