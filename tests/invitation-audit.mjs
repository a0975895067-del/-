import assert from 'node:assert/strict';

const base = process.env.TEST_ORIGIN || 'http://localhost:8790';
const developerHeaders = { origin: base, cookie: 'mm_session=token-test-developer', 'content-type': 'application/json', 'x-csrf-token': 'csrf-test-developer' };
const call = async (path, options = {}) => { const response = await fetch(base + path, options); let data = {}; try { data = await response.json(); } catch {} return { response, data }; };

const runMarker = Date.now() % 200;
for (let round = 1; round <= 3; round++) {
  const ip = `198.51.${runMarker}.${round}`;
  const generateStudent = await call('/api/invitations', { method: 'POST', headers: developerHeaders, body: JSON.stringify({ role: 'student', classId: 'test-701', count: 1, expiresInDays: 1 }) });
  assert.equal(generateStudent.response.status, 201); const studentCode = generateStudent.data.codes[0], studentEmail = `s11501${30 + round}@lmjh.tp.edu.tw`;
  const register = (email, code, password) => call('/api/auth/invitation/register', { method: 'POST', headers: { origin: base, 'cf-connecting-ip': ip, 'content-type': 'application/json' }, body: JSON.stringify({ email, invitationCode: code, password, privacyVersion: '2026-09-01' }) });
  assert.equal((await register(studentEmail, studentCode, 'short')).response.status, 400);
  assert.equal((await register(studentEmail, studentCode, `Student-Safe-Password-${round}`)).response.status, 201);
  assert.equal((await register(studentEmail, studentCode, `Student-Safe-Password-${round}`)).response.status, 401);

  const teacherEmail = `audit-teacher-${round}@lmjh.tp.edu.tw`;
  const generateTeacher = await call('/api/invitations', { method: 'POST', headers: developerHeaders, body: JSON.stringify({ role: 'teacher', email: teacherEmail, count: 1, expiresInDays: 1 }) });
  assert.equal(generateTeacher.response.status, 201); const teacherCode = generateTeacher.data.codes[0];
  assert.equal((await register(`wrong-${teacherEmail}`, teacherCode, `Teacher-Safe-Password-${round}`)).response.status, 401);
  assert.equal((await register(teacherEmail, teacherCode, `Teacher-Safe-Password-${round}`)).response.status, 201);

  const list = await call('/api/invitations', { headers: developerHeaders });
  assert.equal(list.response.status, 200); assert.equal(JSON.stringify(list.data).includes(studentCode), false); assert.equal(JSON.stringify(list.data).includes(teacherCode), false);
  const revocable = await call('/api/invitations', { method: 'POST', headers: developerHeaders, body: JSON.stringify({ role: 'student', classId: 'test-701', count: 1, expiresInDays: 1 }) });
  assert.equal(revocable.response.status, 201); const revokedCode = revocable.data.codes[0], revokedId = revocable.data.invitationIds[0];
  assert.equal((await call(`/api/invitations/${revokedId}`, { method: 'DELETE', headers: { ...developerHeaders, cookie: 'mm_session=token-test-teacher-a', 'x-csrf-token': 'csrf-test-teacher-a' } })).response.status, 404);
  assert.equal((await call(`/api/invitations/${revokedId}`, { method: 'DELETE', headers: developerHeaders })).response.status, 200);
  assert.equal((await register(`s11501${35 + round}@lmjh.tp.edu.tw`, revokedCode, `Student-Safe-Password-R-${round}`)).response.status, 401);
  console.log(`第 ${round} 輪：錯誤密碼不耗碼、單次使用、教師信箱綁定、後台不回傳明碼皆通過。`);
}
console.log('一次性啟用碼安全稽核完成：3 輪、42 項檢查全數通過。');
