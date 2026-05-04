$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$secretPath = Join-Path $projectRoot "secrets\openai_api_key.txt"

if (-not (Test-Path -LiteralPath $secretPath)) {
  Write-Host "APIキー用ファイルが見つかりません。"
  Write-Host "次の場所に openai_api_key.txt を作成し、APIキーを1行で保存してください。"
  Write-Host (Join-Path $projectRoot "secrets")
  exit 1
}

$apiKey = (Get-Content -LiteralPath $secretPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  Write-Host "openai_api_key.txt が空です。APIキーを1行で保存してください。"
  exit 1
}

$previousApiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Process")
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $apiKey, "Process")

try {
  Push-Location $projectRoot
  node .\scripts\server.mjs @args
}
finally {
  Pop-Location
  if ($null -eq $previousApiKey) {
    [Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $null, "Process")
  } else {
    [Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $previousApiKey, "Process")
  }
}
