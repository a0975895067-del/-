import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1');
const vars = Object.fromEntries(readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).filter(Boolean).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const dir = join(root, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const file = readdirSync(dir).find(name => name.endsWith('.sqlite') && name !== 'metadata.sqlite');
if (!file) throw new Error('找不到本機 D1 測試資料庫。');
const db = new DatabaseSync(join(dir, file));
const stamp = new Date().toISOString(), future = new Date(Date.now() + 86400_000).toISOString();
const encode = value => Buffer.from(value).toString('base64url');
const hash = value => encode(createHash('sha256').update(String(value)).digest());
const emailKey = email => encode(createHmac('sha256', vars.OTP_SECRET).update(`email:${email.toLowerCase()}`).digest());
const encrypt = value => { const key = createHash('sha256').update(vars.DATA_ENCRYPTION_KEY).digest(), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv), ciphertext = Buffer.concat([cipher.update(String(value)), cipher.final(), cipher.getAuthTag()]); return `${encode(iv)}.${encode(ciphertext)}`; };
const people = [
  ['test-student-a', 's1150101@lmjh.tp.edu.tw', 'student', 7, 1, 1], ['test-student-b', 's1150201@lmjh.tp.edu.tw', 'student', 7, 2, 1],
  ['test-teacher-a', 'teacher-a@example.test', 'teacher', null, null, null], ['test-teacher-b', 'teacher-b@example.test', 'teacher', null, null, null],
  ['test-developer', vars.DEVELOPER_EMAIL, 'developer', null, null, null], ['test-approved', 'approved@example.test', 'approved_user', null, null, null],
];
for (const row of people) db.prepare("INSERT INTO users(id,email_lookup,email_cipher,role,status,grade,class_number,seat_number,created_at,updated_at) VALUES(?,?,?,?,'active',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email_lookup=excluded.email_lookup,email_cipher=excluded.email_cipher,role=excluded.role,status='active',updated_at=excluded.updated_at").run(row[0], emailKey(row[1]), encrypt(row[1]), row[2], row[3], row[4], row[5], stamp, stamp);
db.prepare("INSERT INTO classes(id,code,grade,class_number,teacher_id,created_at) VALUES('test-701','701',7,1,'test-teacher-a',?) ON CONFLICT(id) DO UPDATE SET teacher_id='test-teacher-a'").run(stamp);
db.prepare("INSERT INTO classes(id,code,grade,class_number,teacher_id,created_at) VALUES('test-702','702',7,2,'test-teacher-b',?) ON CONFLICT(id) DO UPDATE SET teacher_id='test-teacher-b'").run(stamp);
db.prepare("INSERT INTO class_students(class_id,student_id,joined_at) VALUES('test-701','test-student-a',?) ON CONFLICT DO NOTHING").run(stamp);
db.prepare("INSERT INTO class_students(class_id,student_id,joined_at) VALUES('test-702','test-student-b',?) ON CONFLICT DO NOTHING").run(stamp);
for (const [id, student] of [['test-report-a', 'test-student-a'], ['test-report-b', 'test-student-b']]) db.prepare("INSERT INTO reports(id,student_id,grade,unit_summary_cipher,attempts_cipher,total_questions,first_correct,hints_used,created_at,delete_after) VALUES(?,?,7,?,?,10,7,1,?,?) ON CONFLICT(id) DO UPDATE SET unit_summary_cipher=excluded.unit_summary_cipher,attempts_cipher=excluded.attempts_cipher").run(id, student, encrypt(JSON.stringify({ 整數運算: { count: 10, wrong: 3, hints: 1 } })), encrypt('[]'), stamp, future);
for (const row of people) db.prepare('INSERT INTO sessions(id,token_digest,user_id,csrf_digest,expires_at,last_seen_at,ip_digest,user_agent_digest) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET token_digest=excluded.token_digest,csrf_digest=excluded.csrf_digest,expires_at=excluded.expires_at').run(`session-${row[0]}`, hash(`token-${row[0]}`), row[0], hash(`csrf-${row[0]}`), future, stamp, 'test-ip', 'test-ua');
db.close();
console.log('已建立隔離的本機角色測試資料。');
