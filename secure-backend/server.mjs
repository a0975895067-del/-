import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './config.mjs';
import { db, now } from './db.mjs';
import { clearSessionCookie, cookieMap, emailLookup, encryptedEmail, protect, randomToken, revealEmail, securityHeaders, sessionCookie, sha256, unprotect, validateText } from './security.mjs';
import { audit, authenticate, beginEducationLogin, completeDeveloperLogin, completeEducationLogin, createChallenge, decodeReport, finishEducationLogin, login, logout, publicUser, purgeExpired, rateLimit, verifyCsrf, consumeChallenge } from './services.mjs';

const publicRoot = resolve('./outputs');
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json; charset=utf-8' };
const error = (message, status=400) => Object.assign(new Error(message), { status });
const send = (res, status, body, extra={}) => { res.writeHead(status, { ...securityHeaders(), 'content-type':'application/json; charset=utf-8', ...extra }); res.end(JSON.stringify(body)); };
const redirect = (res, location) => { res.writeHead(302, { ...securityHeaders(), location, 'cache-control':'no-store' }); res.end(); };
const body = async req => {
  const type = String(req.headers['content-type'] || '').split(';')[0];
  if (type !== 'application/json') throw error('僅接受 JSON 格式。', 415);
  let size=0; const chunks=[];
  for await (const chunk of req) { size += chunk.length; if (size > config.maxBodyBytes) throw error('資料量過大。', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw error('JSON 格式不正確。'); }
};
const ipKey = req => sha256(String(req.socket.remoteAddress || 'unknown'));
const originGuard = req => {
  if (!['POST','PATCH','PUT','DELETE'].includes(req.method)) return;
  const origin = req.headers.origin;
  const expected = config.production ? config.publicOrigin : `http://${req.headers.host}`;
  if (origin && origin !== expected) throw error('來源驗證失敗。', 403);
};
const requireAuth = (req, roles=[]) => {
  const session = authenticate(cookieMap(req.headers.cookie).mm_session);
  if (!session) throw error('請先登入。', 401);
  if (roles.length && !roles.includes(session.role)) throw error('您沒有此操作權限。', 403);
  if (['POST','PATCH','PUT','DELETE'].includes(req.method)) verifyCsrf(session, req.headers['x-csrf-token']);
  return session;
};
const classScope = session => session.role === 'teacher' ? ' AND c.teacher_id=?' : '';
const requirePrivacyNotice = value => { if (String(value || '') !== config.privacyNoticeVersion) throw error('請先閱讀並確認最新個資告知事項。', 428); };
const acknowledgePrivacy = (email, userId, ipDigest) => db.prepare('INSERT INTO privacy_acknowledgements(id,email,user_id,notice_version,accepted_at,ip_digest) VALUES(?,?,?,?,?,?)').run(randomUUID(),emailLookup(email),userId||null,config.privacyNoticeVersion,now(),ipDigest);

async function api(req,res,url) {
  rateLimit(`api:${ipKey(req)}`, 180, 60);
  if (req.method==='GET' && url.pathname==='/api/health') return send(res,200,{ok:true});
  if (req.method==='GET' && url.pathname==='/api/auth/education/status') return send(res,200,{enabled:config.educationOidc.enabled,provider:'教育雲端帳號'});
  if (req.method==='GET' && url.pathname==='/api/auth/education/start') {
    requirePrivacyNotice(url.searchParams.get('privacy'));
    const result=await beginEducationLogin(ipKey(req));
    return redirect(res,result.authorizationUrl);
  }
  if (req.method==='GET' && url.pathname==='/api/auth/education/callback') {
    if(url.searchParams.get('error'))throw error('教育雲端登入未完成，請重新操作。',401);
    const result=await finishEducationLogin(url.searchParams.get('state'),url.searchParams.get('code'),ipKey(req));
    const destination=new URL('/',config.publicOrigin);
    destination.searchParams.set('education','verify');
    destination.searchParams.set('challenge',result.challengeId);
    destination.searchParams.set('mode',result.mode);
    return redirect(res,destination.toString());
  }
  if (req.method==='POST' && url.pathname==='/api/auth/education/verify-code') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion);const challengeRow=db.prepare('SELECT * FROM auth_challenges WHERE id=?').get(validateText(data.challengeId,80));
    const result=completeEducationLogin(validateText(data.challengeId,80),validateText(data.otp,12),data.application||{},ipKey(req),sha256(req.headers['user-agent']||''));
    const acceptedEmail=result.user?.email||(challengeRow?revealEmail(challengeRow):'');if(acceptedEmail)acknowledgePrivacy(acceptedEmail,result.user?.id,ipKey(req));
    if(result.application)return send(res,201,result);
    return send(res,200,{user:result.user,csrfToken:result.csrf},{'set-cookie':sessionCookie(result.token,config.sessionMinutes*60)});
  }
  if (req.method==='POST' && url.pathname==='/api/auth/request-code') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion); return send(res,202,await createChallenge(data.email,'login',ipKey(req)));
  }
  if (req.method==='POST' && url.pathname==='/api/auth/verify-code') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion); const result=login(validateText(data.challengeId,80),validateText(data.otp,12),ipKey(req),sha256(req.headers['user-agent']||''));
    if(result.requiresDeveloperPassword)return send(res,200,result);
    acknowledgePrivacy(result.user.email,result.user.id,ipKey(req));
    return send(res,200,{user:result.user,csrfToken:result.csrf},{'set-cookie':sessionCookie(result.token,config.sessionMinutes*60)});
  }
  if (req.method==='POST' && url.pathname==='/api/auth/developer-password') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion);const result=completeDeveloperLogin(validateText(data.developerProof,200),validateText(data.password,200),ipKey(req),sha256(req.headers['user-agent']||''));acknowledgePrivacy(result.user.email,result.user.id,ipKey(req));
    return send(res,200,{user:result.user,csrfToken:result.csrf},{'set-cookie':sessionCookie(result.token,config.sessionMinutes*60)});
  }
  if (req.method==='POST' && url.pathname==='/api/applications/request-code') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion); return send(res,202,await createChallenge(data.email,'application',ipKey(req)));
  }
  if (req.method==='POST' && url.pathname==='/api/applications/submit') {
    const data=await body(req);requirePrivacyNotice(data.privacyVersion); const email=consumeChallenge(validateText(data.challengeId,80),validateText(data.otp,12),'application');
    const id=randomUUID(),storedEmail=encryptedEmail(email);
    db.prepare(`INSERT INTO access_applications(id,email,email_cipher,identity,workplace,job_title,status,requested_at) VALUES(?,?,?,?,?,?,'pending',?)`)
      .run(id,storedEmail.lookup,storedEmail.cipher,protect(validateText(data.identity,80)),protect(validateText(data.workplace,120)),protect(validateText(data.jobTitle,120)),now());
    acknowledgePrivacy(email,null,ipKey(req));audit(null,'application.submitted','application',id); return send(res,201,{id,status:'pending'});
  }
  if (req.method==='GET' && url.pathname==='/api/me') { const s=requireAuth(req); return send(res,200,{user:publicUser({...s,id:s.user_id})}); }
  if (req.method==='GET' && url.pathname==='/api/auth/csrf') { const s=requireAuth(req);if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')throw error('來源驗證失敗。',403);const csrf=randomToken();db.prepare('UPDATE sessions SET csrf_digest=?,last_seen_at=? WHERE id=?').run(sha256(csrf),now(),s.id);return send(res,200,{csrfToken:csrf}); }
  if (req.method==='POST' && url.pathname==='/api/auth/logout') { const s=requireAuth(req); logout(s); return send(res,204,{}, {'set-cookie':clearSessionCookie()}); }

  if (req.method==='GET' && url.pathname==='/api/classes') {
    const s=requireAuth(req,['developer','teacher','student']); let rows;
    if(s.role==='developer') rows=db.prepare('SELECT c.*,u.email,u.email_cipher FROM classes c LEFT JOIN users u ON u.id=c.teacher_id ORDER BY grade,class_number').all().map(row=>({...row,teacher_email:row.teacher_id?revealEmail(row):null,email:undefined,email_cipher:undefined}));
    else if(s.role==='teacher') rows=db.prepare('SELECT * FROM classes WHERE teacher_id=? ORDER BY grade,class_number').all(s.user_id);
    else rows=db.prepare('SELECT c.* FROM classes c JOIN class_students cs ON cs.class_id=c.id WHERE cs.student_id=?').all(s.user_id);
    return send(res,200,{classes:rows});
  }
  const assignTeacher=url.pathname.match(/^\/api\/classes\/([^/]+)\/teacher$/);
  if(req.method==='PATCH'&&assignTeacher){const s=requireAuth(req,['developer']);const data=await body(req);const teacher=db.prepare("SELECT id FROM users WHERE email=? AND role='teacher' AND status='active'").get(emailLookup(data.teacherEmail));if(!teacher)throw error('找不到已核准的教師帳號。',404);const changed=db.prepare('UPDATE classes SET teacher_id=?,updated_at=? WHERE id=?').run(teacher.id,now(),assignTeacher[1]).changes;if(!changed)throw error('找不到班級。',404);audit(s.user_id,'class.teacher.assigned','class',assignTeacher[1]);return send(res,200,{ok:true});}

  if(req.method==='GET'&&url.pathname==='/api/teachers'){requireAuth(req,['developer']);const teachers=db.prepare("SELECT id,email,email_cipher,display_name,organization FROM users WHERE role='teacher' AND status='active' ORDER BY id").all().map(row=>({id:row.id,email:revealEmail(row)}));return send(res,200,{teachers});}

  const classStudents=url.pathname.match(/^\/api\/classes\/([^/]+)\/students$/);
  if(req.method==='GET'&&classStudents){const s=requireAuth(req,['developer','teacher']);const cls=db.prepare('SELECT * FROM classes WHERE id=?').get(classStudents[1]);if(!cls)throw error('找不到班級。',404);if(s.role==='teacher'&&cls.teacher_id!==s.user_id)throw error('您不能查看此班級。',403);const students=db.prepare(`SELECT u.id,u.email,u.email_cipher,u.grade,u.class_number,u.seat_number
    FROM users u JOIN class_students cs ON cs.student_id=u.id WHERE cs.class_id=? ORDER BY cs.seat_number`).all(cls.id).map(row=>({...row,email:revealEmail(row),email_cipher:undefined}));return send(res,200,{students});}

  if(req.method==='GET'&&url.pathname==='/api/applications'){requireAuth(req,['developer']);const applications=db.prepare('SELECT * FROM access_applications ORDER BY requested_at DESC LIMIT 500').all().map(row=>({...row,email:revealEmail(row),email_cipher:undefined,identity:unprotect(row.identity),workplace:unprotect(row.workplace),job_title:unprotect(row.job_title)}));return send(res,200,{applications});}
  const review=url.pathname.match(/^\/api\/applications\/([^/]+)\/(approve|reject)$/);
  if(req.method==='POST'&&review){const s=requireAuth(req,['developer']);const data=await body(req);const app=db.prepare("SELECT * FROM access_applications WHERE id=? AND status='pending'").get(review[1]);if(!app)throw error('找不到待審申請。',404);if(review[2]==='approve'){const role=['teacher','approved_user'].includes(data.role)?data.role:'approved_user';const id=db.prepare('SELECT id FROM users WHERE email=?').get(app.email)?.id||randomUUID();db.prepare(`INSERT INTO users(id,email,email_cipher,role,status,created_at,updated_at) VALUES(?,?,?,?, 'active',?,?) ON CONFLICT(email) DO UPDATE SET email_cipher=excluded.email_cipher,role=excluded.role,status='active',updated_at=excluded.updated_at`).run(id,app.email,app.email_cipher,role,now(),now());db.prepare("UPDATE access_applications SET status='approved',reviewed_at=?,reviewed_by=?,approved_role=? WHERE id=?").run(now(),s.user_id,role,app.id);}else db.prepare("UPDATE access_applications SET status='rejected',reviewed_at=?,reviewed_by=? WHERE id=?").run(now(),s.user_id,app.id);audit(s.user_id,`application.${review[2]}d`,'application',app.id);return send(res,200,{ok:true});}

  if(req.method==='POST'&&url.pathname==='/api/assignments'){const s=requireAuth(req,['developer','teacher']);const d=await body(req);const cls=db.prepare('SELECT * FROM classes WHERE id=?').get(validateText(d.classId,80));if(!cls||(s.role==='teacher'&&cls.teacher_id!==s.user_id))throw error('您不能派送此班級作業。',403);const id=randomUUID();db.prepare(`INSERT INTO assignments(id,class_id,teacher_id,title,grade,unit,level,question_count,due_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'active',?,?)`).run(id,cls.id,s.user_id,validateText(d.title,120),cls.grade,validateText(d.unit,120),['easy','medium','hard'].includes(d.level)?d.level:'easy',[10,15,20].includes(Number(d.questionCount))?Number(d.questionCount):10,d.dueAt||null,now(),now());audit(s.user_id,'assignment.created','assignment',id);return send(res,201,{id});}
  const assignmentById=url.pathname.match(/^\/api\/assignments\/([^/]+)$/);
  if(req.method==='PATCH'&&assignmentById){const s=requireAuth(req,['developer','teacher']);const assignment=db.prepare('SELECT * FROM assignments WHERE id=?').get(assignmentById[1]);if(!assignment||s.role==='teacher'&&assignment.teacher_id!==s.user_id)throw error('您不能修改此作業。',403);const d=await body(req),status=['active','archived'].includes(d.status)?d.status:assignment.status;db.prepare('UPDATE assignments SET title=?,unit=?,level=?,question_count=?,due_at=?,status=?,updated_at=? WHERE id=?').run(d.title?validateText(d.title,120):assignment.title,d.unit?validateText(d.unit,120):assignment.unit,['easy','medium','hard'].includes(d.level)?d.level:assignment.level,[10,15,20].includes(Number(d.questionCount))?Number(d.questionCount):assignment.question_count,d.dueAt===undefined?assignment.due_at:(d.dueAt||null),status,now(),assignment.id);audit(s.user_id,'assignment.updated','assignment',assignment.id);return send(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/assignments'){const s=requireAuth(req,['developer','teacher','student']);let rows;if(s.role==='developer')rows=db.prepare('SELECT * FROM assignments ORDER BY created_at DESC LIMIT 500').all();else if(s.role==='teacher')rows=db.prepare('SELECT * FROM assignments WHERE teacher_id=? ORDER BY created_at DESC').all(s.user_id);else rows=db.prepare(`SELECT a.* FROM assignments a JOIN class_students cs ON cs.class_id=a.class_id WHERE cs.student_id=? AND a.status='active' ORDER BY a.created_at DESC`).all(s.user_id);return send(res,200,{assignments:rows});}

  if(req.method==='POST'&&url.pathname==='/api/reports'){const s=requireAuth(req,['student']);const d=await body(req);const total=Number(d.totalQuestions),correct=Number(d.firstCorrect),hints=Number(d.hintsUsed||0);if(!Number.isInteger(total)||total<1||total>100||!Number.isInteger(correct)||correct<0||correct>total||!Number.isInteger(hints)||hints<0||hints>total)throw error('報告數據格式不正確。');let assignment=null;if(d.assignmentId){assignment=db.prepare(`SELECT a.* FROM assignments a JOIN class_students cs ON cs.class_id=a.class_id WHERE a.id=? AND cs.student_id=? AND a.status='active'`).get(validateText(d.assignmentId,80),s.user_id);if(!assignment)throw error('此作業不屬於您的班級或已停止派發。',403);}const summary=JSON.stringify(d.unitSummary||{}),attempts=JSON.stringify(d.attempts||[]);if(summary.length>50000||attempts.length>150000)throw error('報告資料量過大。',413);const grade=Number(assignment?.grade??s.grade);if(!Number.isInteger(grade)||grade<7||grade>9)throw error('學生年級資料不完整，請聯絡管理者。',409);const id=randomUUID(),deleteAfter=new Date(Date.now()+config.reportRetentionDays*86400000).toISOString();db.prepare(`INSERT INTO reports(id,student_id,assignment_id,grade,unit_summary_json,attempts_json,total_questions,first_correct,hints_used,created_at,delete_after) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,s.user_id,assignment?.id||null,grade,protect(summary),protect(attempts),total,correct,hints,now(),deleteAfter);audit(s.user_id,'report.created','report',id);return send(res,201,{id,deleteAfter});}
  const reportById=url.pathname.match(/^\/api\/reports\/([^/]+)$/);
  if(req.method==='GET'&&reportById){
    const s=requireAuth(req,['developer','teacher','student']);const id=reportById[1];let row;
    if(s.role==='developer')row=db.prepare('SELECT * FROM reports WHERE id=?').get(id);
    else if(s.role==='student')row=db.prepare('SELECT * FROM reports WHERE id=? AND student_id=?').get(id,s.user_id);
    else row=db.prepare(`SELECT DISTINCT r.* FROM reports r
                         JOIN class_students cs ON cs.student_id=r.student_id
                         JOIN classes c ON c.id=cs.class_id
                         WHERE r.id=? AND c.teacher_id=?`).get(id,s.user_id);
    if(!row)throw error('找不到報告。',404);
    audit(s.user_id,'report.viewed','report',id);
    return send(res,200,{report:decodeReport(row)});
  }
  if(req.method==='GET'&&url.pathname==='/api/reports'){const s=requireAuth(req,['developer','teacher','student']);let rows;if(s.role==='student')rows=db.prepare('SELECT * FROM reports WHERE student_id=? ORDER BY created_at DESC').all(s.user_id);else if(s.role==='teacher')rows=db.prepare(`SELECT DISTINCT r.* FROM reports r JOIN class_students cs ON cs.student_id=r.student_id JOIN classes c ON c.id=cs.class_id WHERE c.teacher_id=? ORDER BY r.created_at DESC`).all(s.user_id);else rows=db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 2000').all();return send(res,200,{reports:rows.map(decodeReport)});}

  if(req.method==='POST'&&url.pathname==='/api/privacy-requests'){const s=requireAuth(req);const d=await body(req);if(!['access','copy','correct','restrict','delete'].includes(d.requestType))throw error('請選擇有效的個資權利請求。');const id=randomUUID();db.prepare('INSERT INTO privacy_requests(id,user_id,request_type,status,requested_at) VALUES(?,?,?,\'pending\',?)').run(id,s.user_id,d.requestType,now());audit(s.user_id,'privacy.requested','privacy_request',id);return send(res,201,{id,status:'pending'});}
  if(req.method==='POST'&&url.pathname==='/api/admin/purge'){const s=requireAuth(req,['developer']);const result=purgeExpired();audit(s.user_id,'retention.purge','system','retention','success',result);return send(res,200,result);}
  throw error('找不到此功能。',404);
}

async function staticFile(req,res,url){let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/數學任務站.html';const file=normalize(join(publicRoot,pathname));if(!file.startsWith(publicRoot))throw error('禁止存取。',403);const info=await stat(file);if(!info.isFile())throw error('找不到檔案。',404);const content=await readFile(file);res.writeHead(200,{...securityHeaders(),'content-type':mime[extname(file).toLowerCase()]||'application/octet-stream','cache-control':extname(file)==='.html'?'no-store':'public, max-age=3600'});res.end(content);}

export const server=http.createServer(async(req,res)=>{try{originGuard(req);const url=new URL(req.url,config.publicOrigin);if(url.pathname.startsWith('/api/'))await api(req,res,url);else if(req.method==='GET'||req.method==='HEAD')await staticFile(req,res,url);else throw error('不允許的操作。',405);}catch(e){const status=Number(e.status)||((e.code==='ENOENT')?404:500);if(status>=500)console.error(e);send(res,status,{error:status>=500?'伺服器暫時無法處理，請稍後再試。':e.message});}});

if(import.meta.url===pathToFileURL(resolve(process.argv[1] || '')).href){server.listen(config.port,config.host,()=>console.log(`Secure Math Mission: ${config.publicOrigin}`));}
