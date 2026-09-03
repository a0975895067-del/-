import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const env = process.env;
const production = env.NODE_ENV === 'production';
const required = name => {
  const value = env[name];
  if (!value && production) throw new Error(`正式模式缺少必要環境變數：${name}`);
  return value || '';
};

const sessionSecret = required('SESSION_SECRET') || randomBytes(32).toString('hex');
const otpSecret = required('OTP_SECRET') || randomBytes(32).toString('hex');
const dataEncryptionKey = required('DATA_ENCRYPTION_KEY') || sessionSecret;
if (production && (sessionSecret.length < 64 || otpSecret.length < 64 || dataEncryptionKey.length < 64)) {
  throw new Error('SESSION_SECRET、OTP_SECRET 與 DATA_ENCRYPTION_KEY 至少需要 64 個字元。');
}
if (production && new Set([sessionSecret, otpSecret, dataEncryptionKey]).size !== 3) {
  throw new Error('三把安全密鑰必須分別產生，不可重複使用。');
}

const csv = value => String(value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
const educationOidcValues = {
  issuer: String(env.EDU_OIDC_ISSUER || '').replace(/\/$/, ''),
  clientId: env.EDU_OIDC_CLIENT_ID || '',
  clientSecret: env.EDU_OIDC_CLIENT_SECRET || '',
  redirectUri: env.EDU_OIDC_REDIRECT_URI || '',
  roleClaim: env.EDU_OIDC_ROLE_CLAIM || '',
};
const educationOidcPartiallyConfigured = Object.values(educationOidcValues).some(Boolean);
const educationOidcEnabled = Object.values(educationOidcValues).every(Boolean);
if (production && educationOidcPartiallyConfigured && !educationOidcEnabled) {
  throw new Error('教育雲端 OIDC 設定不完整，請確認 ISSUER、CLIENT_ID、CLIENT_SECRET、REDIRECT_URI 與 ROLE_CLAIM。');
}

export const config = Object.freeze({
  production,
  host: env.HOST || '127.0.0.1',
  port: Number(env.PORT || 8787),
  publicOrigin: production ? required('PUBLIC_ORIGIN') : (env.PUBLIC_ORIGIN || 'http://127.0.0.1:8787'),
  databasePath: resolve(env.DATABASE_PATH || './secure-backend/data/math-mission.sqlite'),
  sessionSecret,
  otpSecret,
  dataEncryptionKey,
  developerEmail: required('DEVELOPER_EMAIL').toLowerCase(),
  emailApiUrl: required('EMAIL_API_URL'),
  emailApiKey: required('EMAIL_API_KEY'),
  emailFrom: required('EMAIL_FROM'),
  developerPassword: required('DEVELOPER_PASSWORD') || (env.DEVELOPER_PASSWORD || ''),
  sessionMinutes: Number(env.SESSION_MINUTES || 60),
  otpMinutes: 10,
  reportRetentionDays: Number(env.REPORT_RETENTION_DAYS || 365),
  auditRetentionDays: Number(env.AUDIT_RETENTION_DAYS || 730),
  privacyNoticeVersion: env.PRIVACY_NOTICE_VERSION || '2026-09-01',
  maxBodyBytes: 256 * 1024,
  educationOidc: Object.freeze({
    enabled: educationOidcEnabled,
    ...educationOidcValues,
    scopes: String(env.EDU_OIDC_SCOPES || 'openid email').trim(),
    emailClaim: env.EDU_OIDC_EMAIL_CLAIM || 'email',
    displayNameClaim: env.EDU_OIDC_DISPLAY_NAME_CLAIM || 'name',
    organizationClaim: env.EDU_OIDC_ORGANIZATION_CLAIM || '',
    studentValues: csv(env.EDU_OIDC_STUDENT_VALUES || 'student'),
    teacherValues: csv(env.EDU_OIDC_TEACHER_VALUES || 'teacher,faculty'),
    tokenAuthMethod: env.EDU_OIDC_TOKEN_AUTH_METHOD || 'client_secret_basic',
  }),
});

if (production && !config.publicOrigin.startsWith('https://')) {
  throw new Error('正式模式 PUBLIC_ORIGIN 必須使用 https://');
}
if (config.educationOidc.enabled && !config.educationOidc.issuer.startsWith('https://')) {
  throw new Error('EDU_OIDC_ISSUER 必須使用 https://。');
}
if (config.educationOidc.enabled && !config.educationOidc.redirectUri.startsWith('https://') && production) {
  throw new Error('正式模式 EDU_OIDC_REDIRECT_URI 必須使用 https://。');
}
