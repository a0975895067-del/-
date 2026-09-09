import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backend = await readFile(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const report = await readFile(new URL('../public/report.js', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');

assert.match(backend, /authenticate\(request, \['student', 'approved_user'\]\)/, 'Both student account types must be able to save reports.');
assert.match(backend, /session\.role === 'student' \|\| session\.role === 'approved_user'/, 'Approved users must receive the same self-only report boundary as students.');
assert.match(backend, /WHERE student_id=\? ORDER BY created_at DESC/, 'Learners must only list their own reports.');
assert.match(backend, /WHERE c\.teacher_id=\? ORDER BY r\.created_at DESC/, 'Teachers must remain restricted to their assigned classes.');
assert.match(backend, /student_email_cipher/, 'Developer and teacher report rows must include the encrypted report-owner email.');
assert.match(backend, /report\.student_email = await unseal/, 'Report-owner email must be decrypted only on the server.');
assert.match(report, /\['student',\s*'approved_user'\]\.includes\(role\)/, 'Client must upload reports for both learner account types.');
assert.doesNotMatch(report, /catch\s*\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/, 'Report upload errors must never be silently discarded.');
assert.match(report, /retryReportSave/, 'A visible retry action must be available when report upload fails.');
assert.match(dashboard, /report\.student_email\s*\|\|\s*student\?\.email/, 'Dashboard must identify every report owner using server-authorized data.');
assert.match(dashboard, /refreshReports/, 'Dashboard must provide a report refresh action.');

console.log('Report visibility audit passed: upload, ownership, teacher scope, developer visibility, and failure feedback are present.');
