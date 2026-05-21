# Regenerate asset-manifest.json after adding assets
$kit = Get-ChildItem (Split-Path $PSScriptRoot -Parent) -Directory -ErrorAction SilentlyContinue
if (-not $kit) {
  $kit = Get-ChildItem "D:\UnityHub" -Directory | Where-Object { $_.Name -like '*Slot Machine*' } | Select-Object -First 1
}
$proj = if ($kit.Name -like '*Slot*') { $kit.FullName } else { Split-Path $PSScriptRoot -Parent }
$kitRoot = Join-Path $proj "Assets\ModernNeonCasinoKit"
$out = Join-Path $PSScriptRoot "asset-manifest.json"
$baseUrl = "../Assets/ModernNeonCasinoKit"

$images = Get-ChildItem $kitRoot -Recurse -Filter *.png | ForEach-Object {
  $rel = $_.FullName.Substring($kitRoot.Length + 1).Replace('\','/')
  $dir = Split-Path $rel -Parent
  [ordered]@{ file = $rel; name = $_.Name; category = $(if ($dir) { $dir } else { 'root' }); url = "$baseUrl/$rel" }
}

$scenes = Get-ChildItem $kitRoot -Recurse -Filter *.unity | ForEach-Object {
  $rel = $_.FullName.Substring($kitRoot.Length + 1).Replace('\','/')
  [ordered]@{ file = $rel; name = $_.BaseName; pack = ($rel -split '/')[0] }
}

$prefabs = Get-ChildItem $kitRoot -Recurse -Filter *.prefab | ForEach-Object {
  $rel = $_.FullName.Substring($kitRoot.Length + 1).Replace('\','/')
  $dir = Split-Path $rel -Parent
  [ordered]@{ file = $rel; name = $_.BaseName; category = $dir }
}

[ordered]@{
  generated = (Get-Date -Format o)
  stats = [ordered]@{ images = $images.Count; scenes = $scenes.Count; prefabs = $prefabs.Count }
  scenes = $scenes
  prefabs = $prefabs
  images = $images
} | ConvertTo-Json -Depth 5 | Set-Content $out -Encoding UTF8

Write-Host "OK: $($images.Count) images, $($scenes.Count) scenes, $($prefabs.Count) prefabs -> $out"
