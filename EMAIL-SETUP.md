# 驗證信服務設定

網站已支援由後端透過 Brevo 或 Resend 寄送六位數驗證碼。驗證碼不會回傳給瀏覽器。

## 零預算優先方案：Brevo

1. 建立 Brevo 免費帳號。
2. 在 Senders 建立寄件人，並完成寄件信箱驗證。
3. 建立只供本網站使用的 API key。
4. 在正式託管環境設定下列機密值：

   - `EMAIL_PROVIDER=brevo`
   - `EMAIL_API_URL=https://api.brevo.com/v3/smtp/email`
   - `EMAIL_API_KEY=Brevo 所產生的 API key`
   - `EMAIL_FROM=已驗證的寄件信箱`

5. 重新部署網站後，以開發者信箱按一次「寄送驗證碼」完成實寄測試。

## Resend 方案

Resend 必須先驗證自有網域，才能寄給學生等其他收件人。設定值如下：

- `EMAIL_PROVIDER=resend`
- `EMAIL_API_URL=https://api.resend.com/emails`
- `EMAIL_API_KEY=Resend 所產生的 API key`
- `EMAIL_FROM=已驗證網域下的寄件信箱`

API key 只能存放在正式託管平台的 Secrets／Environment Variables，不得寫入 HTML、JavaScript、GitHub 或本文件。
