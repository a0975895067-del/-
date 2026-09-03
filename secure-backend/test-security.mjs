import assert from 'node:assert/strict';
import { once } from 'node:events';
import { encryptedEmail, protect, studentProfile, securityHeaders, sha256 } from './security.mjs';
import { server } from './server.mjs';
import { db, now } from './db.mjs';
import { hmac } from './security.mjs';
const addChallenge=(id,email,otp,purpose)=>{const stored=encryptedEmail(email);db.prepare('INSERT INTO auth_challenges(id,email,email_cipher,otp_digest,purpose,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').run(id,stored.lookup,stored.cipher,hmac(`${id}:${otp}`),purpose,new Date(Date.now()+600000).toISOString(),now())};

assert.deepEqual(studentProfile('s1130101@lmjh.tp.edu.tw'), { admissionYear:'113',grade:9,classNumber:1,seatNumber:1,classCode:'901' });
assert.equal(studentProfile('s1152040@lmjh.tp.edu.tw').classCode, '720');
assert.equal(studentProfile('s1152140@lmjh.tp.edu.tw'), null);
assert.equal(studentProfile('s1152000@lmjh.tp.edu.tw'), null);
assert.match(securityHeaders()['Content-Security-Policy'], /frame-ancestors 'none'/);

server.listen(0,'127.0.0.1'); await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
const request=async(path,options={})=>{const response=await fetch(origin+path,{...options,headers:{'content-type':'application/json',origin,...(options.headers||{})}});let data={};try{data=await response.json()}catch{}return{response,data};};
try {
  const challengeId='developer-test-challenge',otp='123456';
  addChallenge(challengeId,process.env.DEVELOPER_EMAIL||'developer-ci@example.invalid',otp,'login');
  let r=await request('/api/auth/verify-code',{method:'POST',body:JSON.stringify({challengeId,otp,privacyVersion:'2026-09-01'})});
  assert.equal(r.response.status,200);assert.equal(r.data.requiresDeveloperPassword,true);assert.ok(r.data.developerProof);assert.equal('csrfToken' in r.data,false);
  r=await request('/api/auth/developer-password',{method:'POST',body:JSON.stringify({developerProof:r.data.developerProof,password:process.env.DEVELOPER_PASSWORD,privacyVersion:'2026-09-01'})});
  assert.equal(r.response.status,200); assert.equal(r.data.user.role,'developer');
  const cookie=r.response.headers.get('set-cookie').split(';')[0],csrf=r.data.csrfToken;
  const classes=await request('/api/classes',{method:'GET',headers:{cookie}}); assert.equal(classes.response.status,200);
  const applications=await request('/api/applications',{method:'GET',headers:{cookie}}); assert.equal(applications.response.status,200);
  const noCsrf=await request('/api/admin/purge',{method:'POST',headers:{cookie},body:'{}'}); assert.equal(noCsrf.response.status,403);
  const purge=await request('/api/admin/purge',{method:'POST',headers:{cookie,'x-csrf-token':csrf},body:'{}'}); assert.equal(purge.response.status,200);
  const timestamp=now(),expires=new Date(Date.now()+3600000).toISOString();
  for(const [id,email,role] of [['student-a','s1150101@lmjh.tp.edu.tw','student'],['student-b','s1150102@lmjh.tp.edu.tw','student'],['teacher-a','teacher-a@lmjh.tp.edu.tw','teacher'],['teacher-b','teacher-b@lmjh.tp.edu.tw','teacher']]){const stored=encryptedEmail(email);db.prepare("INSERT INTO users(id,email,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,?,'active',?,?)").run(id,stored.lookup,stored.cipher,role,timestamp,timestamp)}
  db.prepare("INSERT INTO classes(id,code,grade,class_number,admission_year,teacher_id,created_at,updated_at) VALUES('class-701','701',7,1,'115','teacher-a',?,?)").run(timestamp,timestamp);
  db.prepare("INSERT INTO class_students(class_id,student_id,seat_number) VALUES('class-701','student-a',1)").run();
  db.prepare("INSERT INTO reports(id,student_id,grade,unit_summary_json,attempts_json,total_questions,first_correct,hints_used,created_at,delete_after) VALUES('report-a','student-a',7,?,?,10,8,1,?,?)").run(protect('{}'),protect('[]'),timestamp,new Date(Date.now()+86400000).toISOString());
  const sessionFor=(id,token)=>db.prepare('INSERT INTO sessions(id,user_id,token_digest,csrf_digest,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)').run(`session-${id}`,id,sha256(token),sha256(`csrf-${id}`),expires,timestamp,timestamp);
  sessionFor('student-a','token-student-a');sessionFor('student-b','token-student-b');sessionFor('teacher-a','token-teacher-a');sessionFor('teacher-b','token-teacher-b');
  const reportAs=token=>request('/api/reports/report-a',{method:'GET',headers:{cookie:`mm_session=${token}`}});
  assert.equal((await reportAs('token-student-a')).response.status,200);
  assert.equal((await reportAs('token-student-b')).response.status,404);
  assert.equal((await reportAs('token-teacher-a')).response.status,200);
  assert.equal((await reportAs('token-teacher-b')).response.status,404);
  const mailUnavailable=await request('/api/auth/request-code',{method:'POST',body:JSON.stringify({email:'s1150101@lmjh.tp.edu.tw',privacyVersion:'2026-09-01'})});assert.equal(mailUnavailable.response.status,503);assert.equal('developmentOtp' in mailUnavailable.data,false);
  const cross=await fetch(origin+'/api/health',{headers:{origin:'https://evil.invalid'}}); assert.equal(cross.status,200);
  const crossPost=await fetch(origin+'/api/auth/request-code',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.invalid'},body:'{}'}); assert.equal(crossPost.status,403);
  console.log('PASS: 兩階段開發者登入、CSRF、同源、學生/教師單筆報告IDOR隔離及驗證碼不回傳測試');
} finally { server.close(); }
