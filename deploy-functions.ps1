# Deploy NetSpinGame Edge Functions to Supabase
# Run: .\deploy-functions.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$ref = 'tjaqcnaslxjuklaiivjs'

Set-Location $root

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Args)
  & npx --yes supabase @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: npx supabase $($Args -join ' ')"
  }
}

Write-Host ''
Write-Host 'NetSpinGame — Deploy spin + update-settings' -ForegroundColor Cyan
Write-Host "Project: $ref"
Write-Host ''

# ต้องมี Node.js (https://nodejs.org) — ตรวจด้วย: node --version
try {
  $null = Get-Command node -ErrorAction Stop
} catch {
  Write-Host 'ERROR: Node.js not found. Install from https://nodejs.org then run this script again.' -ForegroundColor Red
  exit 1
}

Write-Host 'Step 1: Login (browser will open)...' -ForegroundColor Yellow
Invoke-Supabase login

Write-Host 'Step 2: Link project...' -ForegroundColor Yellow
Invoke-Supabase link --project-ref $ref

Write-Host 'Step 3: Deploy spin...' -ForegroundColor Yellow
Invoke-Supabase functions deploy spin

Write-Host 'Step 4: Deploy update-settings...' -ForegroundColor Yellow
Invoke-Supabase functions deploy update-settings

Write-Host ''
Write-Host 'Done! Test: https://www.xzenzy.com/game.html' -ForegroundColor Green
Write-Host 'Functions: https://supabase.com/dashboard/project/tjaqcnaslxjuklaiivjs/functions'
Write-Host ''
