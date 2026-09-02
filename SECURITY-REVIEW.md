# 數學任務站資安審查說明

## 審查範圍

- `app/api/[...path]/route.ts`：後端 API、登入、授權、班級隔離、報告存取及稽核紀錄。
- `public/local-access.js`：登入、首次啟用及使用權限申請介面。
- `public/secure-auth.js`：前端登入狀態及頁面解鎖。
- `public/secure-dashboard.js`：教師與開發者後台。
- `public/invitation-dashboard.js`：一次性啟用碼產生、查詢與撤銷介面。
- `db/migrations/`：D1 資料庫結構與遷移。
- `tests/`：角色隔離、啟用碼、自訂班級及資安測試。

## 不包含的敏感資料

本審查包刻意排除 `.dev.vars`、本機 D1 資料庫、Session、OTP/TOTP 密鑰、加密金鑰、初始設定碼、套件快取、建置產物及 Git 紀錄。請勿要求把正式環境密鑰放進原始碼。

## 必查安全邊界

1. 所有角色與班級權限必須由後端 Session 決定，不可信任網址參數或前端欄位。
2. 學生只能讀取自己的報告；教師只能讀取自己任教班級；開發者才可跨班級管理。
3. 所有異動 API 必須同時檢查角色、CSRF、來源與資料歸屬。
4. 一次性啟用碼只儲存 HMAC，不儲存明碼；使用、失效與撤銷必須由後端判定。
5. 密碼只保存 PBKDF2 衍生值與隨機鹽；開發者另需 TOTP。
6. 個資欄位使用伺服器端加密；正式金鑰不得提交 Git。
7. 正式環境必須使用 HTTPS、`Secure`、`HttpOnly`、`SameSite` Cookie 及可信來源限制。

## 本機驗證

```text
node tests/security-audit.mjs
node tests/role-access-audit.mjs
node tests/invitation-audit.mjs
node tests/custom-class-audit.mjs
npm run build
```

## 重要限制

目前「直接提出申請」在沒有寄信服務時會標示為信箱未驗證，開發者必須使用校方、電話、面談或可信文件另外核對本人，再產生綁定信箱的一次性啟用碼。
