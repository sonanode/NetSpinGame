# Paste Supabase anon key into js/supabase-config.js
# Usage: .\set-supabase-key.ps1 -Key "eyJhbGci..."

param(
  [Parameter(Mandatory = $true)]
  [string]$Key
)

$configPath = Join-Path $PSScriptRoot 'js\supabase-config.js'
$content = @"
/** Project NetSpinGame — Supabase API */
export const SUPABASE_URL = 'https://tjaqcnaslxjuklaiivjs.supabase.co';
export const SUPABASE_ANON_KEY = '$($Key.Replace("'", "''"))';
"@

Set-Content -Path $configPath -Value $content -Encoding UTF8
Write-Host "Updated $configPath"
