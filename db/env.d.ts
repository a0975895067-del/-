declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PUBLIC_ORIGIN?: string;
    OTP_SECRET?: string;
    DATA_ENCRYPTION_KEY?: string;
    DEVELOPER_EMAIL?: string;
    DEVELOPER_PASSWORD?: string;
    EMAIL_API_URL?: string;
    EMAIL_API_KEY?: string;
    EMAIL_FROM?: string;
    EDU_OIDC_ISSUER?: string;
    EDU_OIDC_CLIENT_ID?: string;
    EDU_OIDC_CLIENT_SECRET?: string;
    EDU_OIDC_REDIRECT_URI?: string;
    EDU_OIDC_ROLE_CLAIM?: string;
  }
}
