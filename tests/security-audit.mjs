import assert from 'node:assert/strict';
import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1');
const vars = Object.fromEntries(readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).filter(Boolean).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
const databaseDir = join(root, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const databasePath = readdirSync(databaseDir).filter(name => name.endsWith('.sqlite') && name !== 'metadata.sqlite').map(name => join(databaseDir, name))[0];
const db = new DatabaseSync(databasePath);
const now = new Date().toISOString(), future = new Date(Date.now() + 86400_000).toISOString();
const b64url = value => Buffer.from(value).toString('base64url');
const digest = value => b64url(createHash('sha256').update(String(value)).digest());
const lookup = email => b64url(createHmac('sha256', vars.OTP_SECRET).update(`email:${email.toLowerCase()}`).digest());
const seal = value => { const key = createHash('sha256').update(vars.DATA_ENCRYPTION_KEY).digest(), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv), ciphertext = Buffer.concat([cipher.update(String(value)), cipher.final(), cipher.getAuthTag()]); return `${b64url(iv)}.${b64url(ciphertext)}`; };

const people = [
  ['test-student-a', 's1150101@lmjh.tp.edu.tw', 'student', 7, 1, 1],
  ['test-student-b', 's1150201@lmjh.tp.edu.tw', 'student', 7, 2, 1],
  ['test-teacher-a', 'teacher-a@example.test', 'teacher', null, null, null],
  ['test-teacher-b', 'teacher-b@example.test', 'teacher', null, null, null],
  ['test-developer', vars.DEVELOPER_EMAIL, 'developer', null, null, null],
  ['test-approved', 'approved@example.test', 'approved_user', null, null, null],
];
for (const row of people) db.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,grade,class_number,seat_number,created_at,updated_at) VALUES(?,?,?,?,'active',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email_lookup=excluded.email_lookup,email_cipher=excluded.email_cipher,role=excluded.role,status='active',updated_at=excluded.updated_at").run(row[0], lookup(row[1]), seal(row[1]), row[2], row[3], row[4], row[5], now, now);
db.prepare("INSERT INTO classes(id,code,grade,class_number,teacher_id,created_at) VALUES('test-701','701',7,1,'test-teacher-a',?) ON CONFLICT(id) DO UPDATE SET teacher_id='test-teacher-a'").run(now);
db.prepare("INSERT INTO classes(id,code,grade,class_number,teacher_id,created_at) VALUES('test-702','702',7,2,'test-teacher-b',?) ON CONFLICT(id) DO UPDATE SET teacher_id='test-teacher-b'").run(now);
db.prepare("INSERT INTO class_students(class_id,student_id,joined_at) VALUES('test-701','test-student-a',?) ON CONFLICT DO NOTHING").run(now);
db.prepare("INSERT INTO class_students(class_id,student_id,joined_at) VALUES('test-702','test-student-b',?) ON CONFLICT DO NOTHING").run(now);
for (const [id, student] of [['test-report-a', 'test-student-a'], ['test-report-b', 'test-student-b']]) db.prepare("INSERT INTO reports(id,student_id,grade,unit_summary_cipher,attempts_cipher,total_questions,first_correct,hints_used,created_at,delete_after) VALUES(?,?,7,?,?,10,7,1,?,?) ON CONFLICT(id) DO UPDATE SET unit_summary_cipher=excluded.unit_summary_cipher,attempts_cipher=excluded.attempts_cipher").run(id, student, seal(JSON.stringify({ 整數運算: { count: 10, wrong: 3, hints: 1 } })), seal(JSON.stringify([])), now, future);
const identities = people.map(row => [row[0], `token-${row[0]}`, `csrf-${row[0]}`]);
for (const [userId, token, csrf] of identities) db.prepare('INSERT INTO sessions(id,token_digest,user_id,csrf_digest,expires_at,last_seen_at,ip_digest,user_agent_digest) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET token_digest=excluded.token_digest,csrf_digest=excluded.csrf_digest,expires_at=excluded.expires_at').run(`session-${userId}`, digest(token), userId, digest(csrf), future, now, 'test-ip', 'test-ua');
db.close();

const base = process.env.TEST_ORIGIN || 'http://localhost:8790';
const request = async (path, userId, options = {}) => {
  const headers = { ...(userId ? { cookie: `mm_session=token-${userId}` } : {}), ...(options.headers || {}) };
  const response = await fetch(base + path, { ...options, headers }); let data = {}; try { data = await response.json(); } catch {}
  return { response, data };
};

for (let round = 1; round <= 3; round++) {
  assert.equal((await request('/api/me', null)).response.status, 401);
  assert.equal((await request('/api/classes', 'test-approved')).response.status, 403);
  const studentOwn = await request('/api/reports/test-report-a', 'test-student-a'); assert.equal(studentOwn.response.status, 200); assert.equal(studentOwn.data.report.student_id, 'test-student-a');
  assert.equal((await request('/api/reports/test-report-b', 'test-student-a')).response.status, 404);
  const teacherReports = await request('/api/reports', 'test-teacher-a'); assert.equal(teacherReports.response.status, 200); assert.deepEqual(teacherReports.data.reports.map(row => row.id), ['test-report-a']);
  assert.equal((await request('/api/classes/test-702/students', 'test-teacher-a')).response.status, 403);
  const developerReports = await request('/api/reports', 'test-developer'); assert.equal(developerReports.response.status, 200); assert.ok(developerReports.data.reports.some(row => row.id === 'test-report-a') && developerReports.data.reports.some(row => row.id === 'test-report-b'));
  assert.equal((await request('/api/privacy-requests', 'test-developer', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ requestType: 'access' }) })).response.status, 403);
  assert.equal((await request('/api/privacy-requests', 'test-developer', { method: 'POST', headers: { origin: base, 'content-type': 'application/json', 'x-csrf-token': 'csrf-test-developer' }, body: JSON.stringify({ requestType: 'access' }) })).response.status, 201);
  assert.equal((await request('/api/auth/request-code', null, { method: 'POST', headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' }, body: '{}' })).response.status, 403);
  assert.equal((await request('/api/auth/request-code', null, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'outsider@example.test', privacyVersion: '2026-09-01' }) })).response.status, 403);
  const applicationMail = await request('/api/applications/request-code', null, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ email: `applicant-${round}@example.test`, privacyVersion: '2026-09-01' }) }); assert.equal(applicationMail.response.status, 503); assert.equal('developmentOtp' in applicationMail.data, false);
  console.log(`第 ${round} 輪：學生、教師、非校內身分、核准一般使用者、開發者權限皆通過。`);
}
console.log('安全稽核完成：3 輪、39 項檢查全數通過。');
