param([Parameter(Mandatory=$true)][string]$ApiUrl)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$config = Join-Path $project 'resources\config\program.json'
$url = [Uri]$ApiUrl
if ($url.Scheme -ne 'https') { throw 'Для публичной сборки нужен HTTPS API URL.' }
if ($url.Query -or $url.Fragment -or $url.UserInfo) { throw 'API URL не должен содержать параметры, фрагмент или учётные данные.' }
$normalized = $ApiUrl.TrimEnd('/')
if (-not $normalized.EndsWith('/api/v1/program')) { throw 'API URL должен заканчиваться на /api/v1/program.' }
$backup = Get-Content -LiteralPath $config -Raw -Encoding utf8
try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($config, (@{ apiUrl = $normalized } | ConvertTo-Json), $utf8)
    Push-Location $project
    try { npm test; if ($LASTEXITCODE) { throw 'Тесты программы завершились с ошибкой.' }; npm run dist; if ($LASTEXITCODE) { throw 'Сборка программы завершилась с ошибкой.' } }
    finally { Pop-Location }
} finally {
    [System.IO.File]::WriteAllText($config, $backup, $utf8)
}
