import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.mjs';
import { emailLookup, protect } from './security.mjs';

mkdirSync(dirname(config.databasePath), { recursive: true });
export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','approved_user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','suspended','deleted')),
  admission_year TEXT, grade INTEGER, class_number INTEGER, seat_number INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS access_applications (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, identity TEXT NOT NULL, workplace TEXT NOT NULL, job_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), requested_at TEXT NOT NULL,
  reviewed_at TEXT, reviewed_by TEXT, approved_role TEXT,
  FOREIGN KEY(reviewed_by) REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_application ON access_applications(email) WHERE status='pending';
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, grade INTEGER NOT NULL CHECK(grade BETWEEN 7 AND 9),
  class_number INTEGER NOT NULL CHECK(class_number BETWEEN 1 AND 20), admission_year TEXT NOT NULL,
  teacher_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(teacher_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS class_students (
  class_id TEXT NOT NULL, student_id TEXT NOT NULL, seat_number INTEGER NOT NULL CHECK(seat_number BETWEEN 1 AND 40),
  PRIMARY KEY(class_id,student_id), UNIQUE(class_id,seat_number),
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL, teacher_id TEXT NOT NULL, title TEXT NOT NULL,
  grade INTEGER NOT NULL, unit TEXT NOT NULL, level TEXT NOT NULL CHECK(level IN ('easy','medium','hard')),
  question_count INTEGER NOT NULL CHECK(question_count IN (10,15,20)), due_at TEXT, status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(teacher_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL, assignment_id TEXT, grade INTEGER NOT NULL,
  unit_summary_json TEXT NOT NULL, attempts_json TEXT NOT NULL, total_questions INTEGER NOT NULL,
  first_correct INTEGER NOT NULL, hints_used INTEGER NOT NULL, created_at TEXT NOT NULL, delete_after TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(assignment_id) REFERENCES assignments(id)
);
CREATE INDEX IF NOT EXISTS idx_reports_student_created ON reports(student_id,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, otp_digest TEXT NOT NULL, purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_email_created ON auth_challenges(email,created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_digest TEXT NOT NULL UNIQUE, csrf_digest TEXT NOT NULL,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, ip_digest TEXT, user_agent_digest TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS developer_login_proofs (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, proof_digest TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL,
  target_type TEXT, target_id TEXT, outcome TEXT NOT NULL, metadata_json TEXT NOT NULL,
  previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, request_type TEXT NOT NULL CHECK(request_type IN ('access','copy','correct','restrict','delete')),
  status TEXT NOT NULL DEFAULT 'pending', requested_at TEXT NOT NULL, completed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS privacy_acknowledgements (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, user_id TEXT, notice_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL, ip_digest TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_privacy_ack_email ON privacy_acknowledgements(email,accepted_at DESC);
`);

const tableColumns = table => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name));
const addColumn = (table, definition) => {
  const name = definition.trim().split(/\s+/)[0];
  if (!tableColumns(table).has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
};

addColumn('users', 'auth_provider TEXT');
addColumn('users', 'external_issuer TEXT');
addColumn('users', 'external_subject TEXT');
addColumn('users', 'display_name TEXT');
addColumn('users', 'organization TEXT');
addColumn('users', 'email_cipher TEXT');
addColumn('access_applications', "source TEXT NOT NULL DEFAULT 'email'");
addColumn('access_applications', 'external_issuer TEXT');
addColumn('access_applications', 'external_subject TEXT');
addColumn('access_applications', 'email_cipher TEXT');
addColumn('auth_challenges', 'context_id TEXT');
addColumn('auth_challenges', 'email_cipher TEXT');
addColumn('developer_login_proofs', 'email_cipher TEXT');

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_identity
  ON users(external_issuer,external_subject)
  WHERE external_issuer IS NOT NULL AND external_subject IS NOT NULL;
CREATE TABLE IF NOT EXISTS education_oidc_states (
  id TEXT PRIMARY KEY, state_digest TEXT NOT NULL UNIQUE, nonce_digest TEXT NOT NULL,
  nonce_cipher TEXT, code_verifier_cipher TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT,
  created_at TEXT NOT NULL, ip_digest TEXT
);
CREATE TABLE IF NOT EXISTS education_pending_identities (
  id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL,
  display_name TEXT, organization TEXT, resolved_role TEXT CHECK(resolved_role IN ('student','teacher') OR resolved_role IS NULL),
  expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_education_pending_email ON education_pending_identities(email,created_at DESC);
`);
addColumn('education_oidc_states', 'nonce_cipher TEXT');
addColumn('education_pending_identities', 'email_cipher TEXT');

const migrateEmailTable = (table, idColumn = 'id') => {
  const rows = db.prepare(`SELECT ${idColumn} record_id,email,email_cipher FROM ${table}`).all();
  const update = db.prepare(`UPDATE ${table} SET email=?,email_cipher=? WHERE ${idColumn}=?`);
  for (const row of rows) {
    if (row.email_cipher || /^[a-f0-9]{64}$/i.test(String(row.email || ''))) continue;
    update.run(emailLookup(row.email), protect(String(row.email).trim().toLowerCase()), row.record_id);
  }
};
for (const table of ['users','access_applications','auth_challenges','developer_login_proofs','education_pending_identities']) migrateEmailTable(table);

const migrateProtectedColumns = (table, columns) => {
  const rows = db.prepare(`SELECT id,${columns.join(',')} FROM ${table}`).all();
  for (const row of rows) {
    const updates = columns.filter(column => row[column] && !String(row[column]).startsWith('v1.'));
    if (!updates.length) continue;
    const values = updates.map(column => protect(row[column]));
    db.prepare(`UPDATE ${table} SET ${updates.map(column => `${column}=?`).join(',')} WHERE id=?`).run(...values, row.id);
  }
};
migrateProtectedColumns('users', ['display_name','organization']);
migrateProtectedColumns('access_applications', ['identity','workplace','job_title']);
migrateProtectedColumns('education_pending_identities', ['display_name','organization']);

const migrateReport = db.prepare('UPDATE reports SET unit_summary_json=?,attempts_json=? WHERE id=?');
for (const row of db.prepare('SELECT id,unit_summary_json,attempts_json FROM reports').all()) {
  if (String(row.unit_summary_json || '').startsWith('v1.') && String(row.attempts_json || '').startsWith('v1.')) continue;
  migrateReport.run(protect(row.unit_summary_json || '{}'), protect(row.attempts_json || '[]'), row.id);
}

export const now = () => new Date().toISOString();
export function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } }
