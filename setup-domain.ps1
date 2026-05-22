# สร้างไฟล์ CNAME สำหรับ GitHub Pages custom domain
# รัน: .\setup-domain.ps1
# หรือ: .\setup-domain.ps1 -Domain "www.netspingame.com"

param(
  [Parameter(Mandatory = $false)]
  [string] $Domain
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

if (-not $Domain) {
  Write-Host ''
  Write-Host 'NetSpinGame — Custom domain setup' -ForegroundColor Cyan
  Write-Host 'Example: www.netspingame.com (recommended)' -ForegroundColor DarkGray
  Write-Host ''
  $Domain = Read-Host 'Enter your domain (one line, no https://)'
}

$Domain = $Domain.Trim().ToLower() -replace '^https?://', '' -replace '/$', ''

if (-not $Domain -or $Domain -notmatch '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(\.[a-z]{2,})+$') {
  Write-Host 'Invalid domain format.' -ForegroundColor Red
  exit 1
}

$cnamePath = Join-Path $root 'CNAME'
Set-Content -Path $cnamePath -Value $Domain -Encoding utf8NoBOM -NoNewline
Add-Content -Path $cnamePath -Value '' -Encoding utf8NoBOM

Write-Host ''
Write-Host "Created: $cnamePath" -ForegroundColor Green
Write-Host "  Content: $Domain"
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host '  1. DNS: CNAME  www  ->  sonanode.github.io  (if using www)'
Write-Host '  2. GitHub: sonanode/NetSpinGame -> Settings -> Pages -> Custom domain'
Write-Host '  3. git add CNAME && git commit -m "Add custom domain" && git push'
Write-Host '  4. Supabase Auth URLs -> see SETUP-DOMAIN.md section 5'
Write-Host '  5. Wait for HTTPS (green check) then test login'
Write-Host ''
Write-Host 'Full guide: SETUP-DOMAIN.md' -ForegroundColor Cyan
