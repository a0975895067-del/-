# 數學任務站

以七、八、九年級國中數學為核心的公益學習網站，提供分單元、難易度與題數練習，以及提示、解析與學習回饋。

## 兩種部署方式

- **GitHub Pages 公益版**：不用登入，不上傳作答或個人資料；由 `github-deploy/site` 自動發布。
- **完整安全版**：包含學生、教師、開發者角色、教育信箱驗證、班級與報告功能；必須部署在支援 Node.js、HTTPS、密鑰及持久化資料庫的後端主機，不能只用 GitHub Pages。

完整說明請閱讀 [DEPLOYMENT.md](DEPLOYMENT.md) 與 [安全及個資說明](secure-backend/SECURITY-AND-PRIVACY.md)。

## 安全原則

- 驗證碼、角色與資料權限皆由伺服器判斷。
- 正式環境必須設定彼此不同的 Session、OTP 與資料加密密鑰。
- 儲存庫不得提交 `.env`、SQLite 資料庫、學生名冊、測驗報告或其他真實個人資料。
- GitHub Pages 版本不提供登入與班級資料功能。

## 上架前

1. 在 GitHub 儲存庫的 **Settings → Pages** 將來源設為 **GitHub Actions**。
2. 推送至 `main` 後，`Deploy GitHub Pages` 工作流程會發布公益版。
3. 完整版需另行設定後端 HTTPS 主機、教育雲端 OIDC／郵件服務與 GitHub Secrets。

本專案尚未指定開源授權；未經製作者明確授權，不代表可任意轉授權或商業使用。
