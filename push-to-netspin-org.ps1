# Push game to https://github.com/NetSpinGame/NetSpinGame
# Usage (PowerShell) — do NOT paste token into chat; use env var only:
#   $env:GITHUB_PAT = "ghp_xxxxxxxx"
#   .\push-to-netspin-org.ps1

param(
  [string]$Org = "NetSpinGame",
  [string]$Repo = "NetSpinGame",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"
$token = if ($Token) { $Token } else { $env:GITHUB_PAT }
if (-not $token) {
  Write-Host "Provide token:" -ForegroundColor Yellow
  Write-Host '  .\push-to-netspin-org.ps1 -Token "ghp_..."' -ForegroundColor Cyan
  Write-Host '  or: $env:GITHUB_PAT = "ghp_..."; .\push-to-netspin-org.ps1' -ForegroundColor Cyan
  Write-Host "Scopes: repo (+ admin:org to auto-create repository)"
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  Accept        = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$repoFull = "$Org/$Repo"
$apiUrl = "https://api.github.com/repos/$repoFull"

Write-Host "Checking $repoFull ..."
try {
  Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get | Out-Null
  Write-Host "Repository exists."
} catch {
  Write-Host "Creating repository $repoFull ..."
  $body = @{
    name        = $Repo
    description = "Neon Vegas 4x5 HTML5 slot game"
    visibility  = "public"
    auto_init   = $false
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "https://api.github.com/orgs/$Org/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Created."
  } catch {
    Write-Host "Could not create via API (need org admin). Create empty repo at:" -ForegroundColor Red
    Write-Host "  https://github.com/organizations/$Org/repositories/new" -ForegroundColor Cyan
    Write-Host "Then run this script again."
    exit 1
  }
}

$remoteUrl = "https://x-access-token:${token}@github.com/${repoFull}.git"
Write-Host "Pushing to $repoFull ..."
git remote remove netspin 2>$null
git remote add netspin $remoteUrl
git push -u netspin master --force

# Pages
Write-Host "Enabling GitHub Pages..."
$pagesBody = @{ build_type = "legacy"; source = @{ branch = "master"; path = "/" } } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$repoFull/pages" -Headers $headers -Method Post -Body $pagesBody -ContentType "application/json" | Out-Null
  Write-Host "Pages enabled."
} catch {
  Write-Host "Enable Pages manually: Settings -> Pages -> master / (root)"
}

Write-Host ""
Write-Host "Done. Game URL (wait 1-3 min):" -ForegroundColor Green
Write-Host "  https://$($Org.ToLower()).github.io/$Repo/" -ForegroundColor Cyan
Write-Host "  https://github.com/$repoFull" -ForegroundColor Cyan

# Remove token from remote URL for safety
git remote set-url netspin "https://github.com/$repoFull.git"
