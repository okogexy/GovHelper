param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$site = Join-Path $root 'GosHelperSite'
$program = Join-Path $root 'program\Helper'

if (-not (Get-Command php -ErrorAction SilentlyContinue)) { throw 'PHP 8.3+ не найден в PATH.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js/npm не найден в PATH.' }

Push-Location $site
try {
    if (-not (Test-Path 'vendor\autoload.php')) { composer install --no-interaction }
    if (-not (Test-Path 'node_modules')) { npm install }
    if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env'; php artisan key:generate --ansi }
    if (-not (Test-Path 'database\database.sqlite')) { New-Item -ItemType File 'database\database.sqlite' | Out-Null }
    $env:GOVHELPER_LOCAL_AUTO_VERIFY = 'true'
    php artisan optimize:clear
    php artisan migrate --force
    if (-not $SkipBuild) { npm run build }
    $server = Start-Process php -ArgumentList @('artisan','serve','--host=127.0.0.1','--port=8000') -WorkingDirectory $site -WindowStyle Hidden -PassThru
} finally { Pop-Location }

try {
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try { $ready = (Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/program/ping' -TimeoutSec 2).ok; if ($ready) { break } } catch {}
        Start-Sleep -Milliseconds 300
    }
    if (-not $ready) { throw 'Локальный сайт не запустился.' }
    Push-Location $program
    try {
        if (-not (Test-Path 'node_modules')) { npm install }
        if (-not $SkipBuild) { npm run build }
        npm start
    } finally { Pop-Location }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
