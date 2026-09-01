$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $node)) { throw '找不到內附的 Node.js 執行環境。' }
function Read-SecretText([string]$Prompt) {
  $secureValue = Read-Host $Prompt -AsSecureString
  $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer)
  }
}

function Get-Sha512Hex([string]$Value) {
  $sha = [Security.Cryptography.SHA512]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

$developerPassword = Read-SecretText '請設定開發者第二階段登入密碼'
if ($developerPassword.Length -lt 16) { throw '開發者密碼至少需要 16 個字元。' }

$localMasterPassword = Read-SecretText '請輸入本機資料安全主密碼（每次重開都要使用同一組）'
if ($localMasterPassword.Length -lt 20) { throw '本機資料安全主密碼至少需要 20 個字元。' }
$env:NODE_ENV = 'development'
$env:DEVELOPER_PASSWORD = $developerPassword
$env:SESSION_SECRET = Get-Sha512Hex "$localMasterPassword|math-session"
$env:OTP_SECRET = Get-Sha512Hex "$localMasterPassword|math-otp"
$env:DATA_ENCRYPTION_KEY = Get-Sha512Hex "$localMasterPassword|math-data"
$env:DATABASE_PATH = Join-Path $workspace 'secure-backend\data\local-secure.sqlite'
Set-Location -LiteralPath $workspace
Write-Host '安全版網址：http://127.0.0.1:8787/數學任務站.html' -ForegroundColor Green
Write-Host '請妥善保存本機資料安全主密碼；遺失後既有加密資料將無法復原。' -ForegroundColor Yellow
Write-Host '請保持此視窗開啟；關閉視窗即停止本機網站。' -ForegroundColor Yellow
& $node 'secure-backend/server.mjs'
