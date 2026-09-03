CREATE TABLE users (
  id TEXT PRIMARY KEY, email_lookup TEXT NOT NULL UNIQUE, email_cipher TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','developer','approved_user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  grade INTEGER, class_number INTEGER, seat_number INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE classes (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, grade INTEGER NOT NULL, class_number INTEGER NOT NULL,
  teacher_id TEXT REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE class_students (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL, PRIMARY KEY (class_id, student_id)
);
CREATE TABLE access_applications (
  id TEXT PRIMARY KEY, email_lookup TEXT NOT NULL, email_cipher TEXT NOT NULL,
  identity_cipher TEXT NOT NULL, workplace_cipher TEXT NOT NULL, job_title_cipher TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT, approved_role TEXT
);
CREATE TABLE assignments (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classes(id), teacher_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, grade INTEGER NOT NULL, unit TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('easy','medium','hard')),
  question_count INTEGER NOT NULL CHECK (question_count IN (10,15,20)), due_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), assignment_id TEXT REFERENCES assignments(id),
  grade INTEGER NOT NULL, unit_summary_cipher TEXT NOT NULL, attempts_cipher TEXT NOT NULL,
  total_questions INTEGER NOT NULL, first_correct INTEGER NOT NULL, hints_used INTEGER NOT NULL,
  created_at TEXT NOT NULL, delete_after TEXT NOT NULL
);
CREATE TABLE auth_challenges (
  id TEXT PRIMARY KEY, email_lookup TEXT NOT NULL, email_cipher TEXT NOT NULL, purpose TEXT NOT NULL,
  otp_digest TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL,
  consumed_at TEXT, created_at TEXT NOT NULL, ip_digest TEXT NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, token_digest TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id),
  csrf_digest TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
  ip_digest TEXT NOT NULL, user_agent_digest TEXT NOT NULL
);
CREATE TABLE developer_login_proofs (
  id TEXT PRIMARY KEY, email_lookup TEXT NOT NULL, proof_digest TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, consumed_at TEXT, ip_digest TEXT NOT NULL
);
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL);
CREATE TABLE privacy_acknowledgements (
  user_id TEXT NOT NULL REFERENCES users(id), version TEXT NOT NULL, acknowledged_at TEXT NOT NULL,
  PRIMARY KEY (user_id, version)
);
CREATE TABLE privacy_requests (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', requested_at TEXT NOT NULL
);
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT,
  outcome TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE education_oidc_states (
  id TEXT PRIMARY KEY, state_digest TEXT NOT NULL UNIQUE, nonce TEXT NOT NULL, verifier_cipher TEXT NOT NULL,
  ip_digest TEXT NOT NULL, privacy_version TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_reports_student ON reports(student_id, created_at);
CREATE INDEX idx_class_teacher ON classes(teacher_id);
CREATE INDEX idx_applications_status ON access_applications(status, requested_at);
