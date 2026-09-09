import assert from 'node:assert/strict';

const base = process.env.TEST_ORIGIN || 'http://localhost:8790';
const request = async (path, userId, options = {}) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const headers = {
      ...(userId ? { cookie: `mm_session=token-${userId}` } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(base + path, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch {}
    if (response.status !== 503 || attempt === 3) return { response, data };
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
};

const patchAccount = (actor, id, body, csrf = `csrf-${actor}`) => request(`/api/users/${id}`, actor, {
  method: 'PATCH',
  headers: {
    origin: base,
    'content-type': 'application/json',
    'x-csrf-token': csrf,
  },
  body: JSON.stringify(body),
});

for (let round = 1; round <= 3; round++) {
  assert.equal((await patchAccount('test-student-a', 'test-approved', {
    email: 'blocked-student@example.test', role: 'approved_user', classId: '',
  })).response.status, 403, '學生不得編輯帳號');

  assert.equal((await patchAccount('test-teacher-a', 'test-approved', {
    email: 'blocked-teacher@example.test', role: 'approved_user', classId: '',
  })).response.status, 403, '教師不得編輯帳號');

  const corrected = `corrected-account-${round}@example.test`;
  const updateApproved = await patchAccount('test-developer', 'test-approved', {
    email: corrected, role: 'approved_user', classId: '',
  });
  assert.equal(updateApproved.response.status, 200, JSON.stringify(updateApproved.data));

  const duplicate = await patchAccount('test-developer', 'test-approved', {
    email: 'teacher-a@example.test', role: 'approved_user', classId: '',
  });
  assert.equal(duplicate.response.status, 409, '不得將信箱更正成既有帳號');

  const unassign = await patchAccount('test-developer', 'test-student-b', {
    email: 's1150201@lmjh.tp.edu.tw', role: 'student', classId: '',
  });
  assert.equal(unassign.response.status, 200, JSON.stringify(unassign.data));

  const users = await request('/api/users', 'test-developer');
  assert.equal(users.response.status, 200);
  const approved = users.data.users.find((row) => row.id === 'test-approved');
  const student = users.data.users.find((row) => row.id === 'test-student-b');
  assert.equal(approved.email, corrected);
  assert.equal(approved.role, 'approved_user');
  assert.equal(student.classCodes, '', '未分班狀態須保留');

  const reports = await request('/api/reports', 'test-developer');
  assert.equal(reports.response.status, 200);
  const report = reports.data.reports.find((row) => row.id === 'test-report-b');
  assert.ok(report, '未分班學生的既有報告不得消失');
  assert.equal(report.class_codes, '');
  assert.equal(report.student_role, 'student');

  const restoreClass = await patchAccount('test-developer', 'test-student-b', {
    email: 's1150201@lmjh.tp.edu.tw', role: 'student', classId: 'test-702',
  });
  assert.equal(restoreClass.response.status, 200, JSON.stringify(restoreClass.data));

  const restoreApproved = await patchAccount('test-developer', 'test-approved', {
    email: 'approved@example.test', role: 'approved_user', classId: '',
  });
  assert.equal(restoreApproved.response.status, 200, JSON.stringify(restoreApproved.data));

  console.log(`第 ${round} 輪：信箱更正、角色限制、未分班、重新分班與報告保留皆通過。`);
}

console.log('帳號管理整合稽核完成：3 輪全數通過。');
