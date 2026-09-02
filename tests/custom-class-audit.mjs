import assert from 'node:assert/strict';

const base = process.env.TEST_ORIGIN || 'http://localhost:8790', marker = Date.now();
const headers = (user, csrf) => ({ origin: base, cookie: `mm_session=token-${user}`, 'content-type': 'application/json', 'x-csrf-token': csrf });
const developer = headers('test-developer', 'csrf-test-developer'), teacher = headers('test-teacher-a', 'csrf-test-teacher-a');
const call = async (path, options = {}) => { const response = await fetch(base + path, options); let data = {}; try { data = await response.json(); } catch {} return { response, data }; };

for (let round = 1; round <= 3; round++) {
  const email = `selflearn-${marker}-${round}@example.test`, ip = `203.0.${marker % 200}.${round}`;
  const applicationBody = JSON.stringify({ email, identity: '自學生', workplace: '個人自學', jobTitle: '八年級先修', privacyVersion: '2026-09-01' });
  const application = await call('/api/applications/direct', { method: 'POST', headers: { origin: base, 'cf-connecting-ip': ip, 'content-type': 'application/json' }, body: applicationBody }); assert.equal(application.response.status, 201);
  assert.equal((await call('/api/applications/direct', { method: 'POST', headers: { origin: base, 'cf-connecting-ip': ip, 'content-type': 'application/json' }, body: applicationBody })).response.status, 409);
  const applications = await call('/api/applications', { headers: developer }); assert.ok(applications.data.applications.some(row => row.id === application.data.id && Number(row.email_verified) === 0));

  const className = `自學先修測試-${marker}-${round}`;
  assert.equal((await call('/api/classes', { method: 'POST', headers: teacher, body: JSON.stringify({ code: className, grade: 8 }) })).response.status, 403);
  const created = await call('/api/classes', { method: 'POST', headers: developer, body: JSON.stringify({ code: className, grade: 8 }) }); assert.equal(created.response.status, 201); assert.equal(created.data.custom, true);
  assert.equal((await call('/api/invitations', { method: 'POST', headers: developer, body: JSON.stringify({ role: 'student', classId: created.data.id, count: 1 }) })).response.status, 400);
  const invitation = await call('/api/invitations', { method: 'POST', headers: developer, body: JSON.stringify({ role: 'student', classId: created.data.id, email, count: 1 }) }); assert.equal(invitation.response.status, 201);
  const register = (candidate, password) => call('/api/auth/invitation/register', { method: 'POST', headers: { origin: base, 'cf-connecting-ip': ip, 'content-type': 'application/json' }, body: JSON.stringify({ email: candidate, invitationCode: invitation.data.codes[0], password, privacyVersion: '2026-09-01' }) });
  assert.equal((await register(`wrong-${email}`, `External-Safe-Password-${round}`)).response.status, 401);
  assert.equal((await register(email, `External-Safe-Password-${round}`)).response.status, 201);
  const students = await call(`/api/classes/${encodeURIComponent(created.data.id)}/students`, { headers: developer }); assert.ok(students.data.students.some(row => row.email === email));
  console.log(`第 ${round} 輪：直接申請、自訂班級、個人信箱綁定及歸班皆通過。`);
}
console.log('自學／先修／重考生流程稽核完成：3 輪、30 項檢查全數通過。');
