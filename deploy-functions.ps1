# Deploy NetSpinGame Edge Functions to Supabase
# Run: .\deploy-functions.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$ref = 'tjaqcnaslxjuklaiivjs'
$cli = 'npx'
$args = @('supabase@latest')

Set-Location $root

Write-Host ''
Write-Host 'NetSpinGame — Deploy spin + update-settings' -ForegroundColor Cyan
Write-Host "Project: $ref"
Write-Host ''

Write-Host 'Step 1: Login (browser will open if needed)...' -ForegroundColor Yellow
& $cli @($args + 'login')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Step 2: Link project...' -ForegroundColor Yellow
& $cli @($args + 'link', '--project-ref', $ref)
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Step 3: Deploy spin...' -ForegroundColor Yellow
& $cli @($args + 'functions', 'deploy', 'spin')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Step 4: Deploy update-settings...' -ForegroundColor Yellow
& $cli @($args + 'functions', 'deploy', 'update-settings')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Done! Test: https://www.xzenzy.com/game.html' -ForegroundColor Green
Write-Host 'Functions: https://supabase.com/dashboard/project/tjaqcnaslxjuklaiivjs/functions'
Write-Host ''
