# 數學任務站安全上架方式

## GitHub 的角色

GitHub Pages 發布 `github-deploy/site`，只提供匿名數學練習，不登入、不保存學生資料。完整登入版的程式碼可放在 GitHub，但執行時必須使用具備 HTTPS、祕密管理與持久加密磁碟的後端主機。

`publish-container.yml` 會把安全版製作成 GHCR 容器映像；GitHub 不會因此成為資料庫主機。請將映像部署到學校核准的主機或容器服務，並掛載私有持久磁碟到 `/data`。

## 正式後端必要設定

依 `secure-backend/.env.example` 在主機的祕密管理功能設定所有值。不得把 `.env`、教育雲端 Client Secret、郵件 API Key、學生名冊或 SQLite 檔案提交到 GitHub。

必要條件：

1. `PUBLIC_ORIGIN` 是完整登入版實際使用的 HTTPS 網址。
2. 三把至少 64 字元且互不相同的 `SESSION_SECRET`、`OTP_SECRET`、`DATA_ENCRYPTION_KEY`。
3. 已核准的寄信服務設定。
4. 教育雲端介接核准後取得的 OIDC Issuer、Client ID、Client Secret 與 Redirect URI。
5. `/data` 使用加密磁碟，備份也必須加密並定期還原演練。
6. 對外 TLS 由受管平台或反向代理終止；不可直接將 8787 連接埠暴露到網際網路。

## 上線閘門

GitHub Actions 的三套角色與安全測試必須全部通過。正式站還必須完成教育雲端實際帳號驗收、寄信驗收、備份還原、弱點掃描、滲透測試、個資告知與校方核准，才可開始蒐集真實學生資料。
