import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { config } from './config.mjs';
import { normalizeEmail, safeEqual, sha256 } from './security.mjs';

const oidc = config.educationOidc;
const cache = { discovery: null, discoveryAt: 0, jwks: null, jwksAt: 0 };
const fail = (message, status = 502) => Object.assign(new Error(message), { status });

const claimAt = (claims, path) => String(path || '').split('.').filter(Boolean).reduce((value, key) => value?.[key], claims);
const claimValues = value => {
  if (Array.isArray(value)) return value.flatMap(claimValues);
  if (value === null || value === undefined) return [];
  return String(value).split(/[;,]/).map(item => item.trim().toLowerCase()).filter(Boolean);
};
const firstText = value => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') return String(value.name || value.zh_TW || value['zh-TW'] || '').trim();
  return '';
};
const base64Json = value => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); }
  catch { throw fail('教育雲端回傳的身分資料格式不正確。', 401); }
};
const requireHttpsEndpoint = (value, label) => {
  let url;
  try { url = new URL(value); } catch { throw fail(`教育雲端 ${label} 設定無效。`); }
  if (url.protocol !== 'https:') throw fail(`教育雲端 ${label} 必須使用 HTTPS。`);
  return url.toString();
};
const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw fail('教育雲端身分服務目前無法回應。', 503);
  const type = String(response.headers.get('content-type') || '');
  if (!type.includes('json')) throw fail('教育雲端身分服務回傳格式不正確。');
  return response.json();
};

export function resolveEducationRole(claims) {
  const values = claimValues(claimAt(claims, oidc.roleClaim));
  if (values.some(value => oidc.teacherValues.includes(value))) return 'teacher';
  if (values.some(value => oidc.studentValues.includes(value))) return 'student';
  return null;
}

export function educationIdentity(claims) {
  const email = normalizeEmail(claimAt(claims, oidc.emailClaim));
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw fail('教育雲端未提供可使用的電子郵件信箱。', 422);
  const displayName = firstText(claimAt(claims, oidc.displayNameClaim)) || firstText(claims.name) || '';
  const organization = oidc.organizationClaim ? firstText(claimAt(claims, oidc.organizationClaim)) : '';
  return {
    issuer: String(claims.iss || ''),
    subject: String(claims.sub || ''),
    email,
    displayName: displayName.slice(0, 120),
    organization: organization.slice(0, 160),
    role: resolveEducationRole(claims),
  };
}

async function discovery() {
  if (!oidc.enabled) throw fail('教育雲端帳號介接尚未啟用。', 503);
  if (cache.discovery && Date.now() - cache.discoveryAt < 3600000) return cache.discovery;
  const endpoint = requireHttpsEndpoint(`${oidc.issuer}/.well-known/openid-configuration`, '探索端點');
  const document = await fetchJson(endpoint);
  if (!safeEqual(document.issuer, oidc.issuer)) throw fail('教育雲端簽發者與系統設定不符。');
  for (const field of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) requireHttpsEndpoint(document[field], field);
  cache.discovery = document;
  cache.discoveryAt = Date.now();
  return document;
}

export async function buildEducationAuthorizationUrl({ state, nonce, codeChallenge }) {
  const document = await discovery();
  const url = new URL(document.authorization_endpoint);
  url.searchParams.set('client_id', oidc.clientId);
  url.searchParams.set('redirect_uri', oidc.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', oidc.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function verifyIdToken(idToken, expectedNonce, document) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw fail('教育雲端未回傳有效的身分憑證。', 401);
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64Json(encodedHeader);
  const claims = base64Json(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw fail('教育雲端憑證使用未允許的簽章格式。', 401);
  if (!cache.jwks || Date.now() - cache.jwksAt >= 900000) {
    cache.jwks = await fetchJson(requireHttpsEndpoint(document.jwks_uri, '金鑰端點'));
    cache.jwksAt = Date.now();
  }
  let jwk = cache.jwks?.keys?.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) {
    cache.jwks = await fetchJson(requireHttpsEndpoint(document.jwks_uri, '金鑰端點'));
    cache.jwksAt = Date.now();
    jwk = cache.jwks?.keys?.find(key => key.kid === header.kid && key.kty === 'RSA');
  }
  if (!jwk) throw fail('找不到教育雲端憑證的驗證金鑰。', 401);
  const valid = verifySignature('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url'));
  if (!valid) throw fail('教育雲端身分憑證簽章驗證失敗。', 401);

  const timestamp = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!safeEqual(claims.iss, oidc.issuer) || !audiences.some(value => safeEqual(value, oidc.clientId))) throw fail('教育雲端憑證不是核發給本站。', 401);
  if (audiences.length > 1 && !safeEqual(claims.azp, oidc.clientId)) throw fail('教育雲端憑證的授權對象不符。', 401);
  if (!Number.isFinite(claims.exp) || claims.exp < timestamp - 60 || (Number.isFinite(claims.iat) && claims.iat > timestamp + 120)) throw fail('教育雲端憑證已過期或時間不正確。', 401);
  if (!safeEqual(sha256(claims.nonce || ''), sha256(expectedNonce))) throw fail('教育雲端登入流程驗證失敗。', 401);
  if (!claims.sub || String(claims.sub).length > 255) throw fail('教育雲端未提供有效的帳號識別碼。', 401);
  return claims;
}

export async function exchangeEducationCode({ code, codeVerifier, nonce }) {
  const document = await discovery();
  const parameters = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oidc.redirectUri,
    client_id: oidc.clientId,
    code_verifier: codeVerifier,
  });
  const headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
  if (oidc.tokenAuthMethod === 'client_secret_post') parameters.set('client_secret', oidc.clientSecret);
  else if (oidc.tokenAuthMethod === 'client_secret_basic') headers.authorization = `Basic ${Buffer.from(`${oidc.clientId}:${oidc.clientSecret}`).toString('base64')}`;
  else throw fail('教育雲端 Token 驗證方式設定不受支援。');
  const tokenSet = await fetchJson(requireHttpsEndpoint(document.token_endpoint, 'Token 端點'), { method: 'POST', headers, body: parameters });
  let claims = await verifyIdToken(tokenSet.id_token, nonce, document);
  if (document.userinfo_endpoint && tokenSet.access_token) {
    const userInfo = await fetchJson(requireHttpsEndpoint(document.userinfo_endpoint, 'UserInfo 端點'), { headers: { authorization: `Bearer ${tokenSet.access_token}`, accept: 'application/json' } });
    if (!safeEqual(userInfo.sub, claims.sub)) throw fail('教育雲端使用者資料與身分憑證不符。', 401);
    claims = { ...claims, ...userInfo, iss: claims.iss, sub: claims.sub, aud: claims.aud, nonce: claims.nonce };
  }
  return educationIdentity(claims);
}
