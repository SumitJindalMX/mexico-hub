<#
.SYNOPSIS
  Add/update the Amdocs Azure DevOps git remote and push main (internal mirror).

.DESCRIPTION
  Public GitHub (origin) stays the live source of truth for Pages and editor writes.
  This script only mirrors main to remote "amdocs".

.PARAMETER CloneUrl
  ADO HTTPS (or SSH) clone URL. If omitted, reads ./.ado-remote (first non-comment line).

.EXAMPLE
  pwsh -File scripts/sync-amdocs.ps1 -CloneUrl "https://dev.azure.com/org/project/_git/MexicoHub"

.EXAMPLE
  Copy-Item .ado-remote.example .ado-remote   # then edit the URL
  pwsh -File scripts/sync-amdocs.ps1
#>
param(
  [string]$CloneUrl = "",
  [string]$RemoteName = "amdocs",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Read-AdoUrlFromFile {
  $path = Join-Path $root ".ado-remote"
  if (-not (Test-Path $path)) { return "" }
  $line = Get-Content $path |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and ($_ -notmatch '^\s*#') } |
    Select-Object -First 1
  return [string]$line
}

if (-not $CloneUrl) {
  $CloneUrl = $env:ADO_MIRROR_URL
}
if (-not $CloneUrl) {
  $CloneUrl = Read-AdoUrlFromFile
}

if (-not $CloneUrl) {
  Write-Error @"
No ADO clone URL. Provide one of:
  1) pwsh -File scripts/sync-amdocs.ps1 -CloneUrl 'https://dev.azure.com/<org>/<project>/_git/MexicoHub'
  2) Copy .ado-remote.example to .ado-remote and paste the real URL
  3) Set env ADO_MIRROR_URL
See docs/internal-mirror.md
"@
}

if ($CloneUrl -match 'REPLACE_ORG|REPLACE_PROJECT') {
  Write-Error "Replace the placeholder URL with your real Amdocs ADO clone URL. See docs/internal-mirror.md"
}

$existing = git remote get-url $RemoteName 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
  if ($existing -ne $CloneUrl) {
    Write-Host "Updating remote '$RemoteName' → $CloneUrl"
    git remote set-url $RemoteName $CloneUrl
  } else {
    Write-Host "Remote '$RemoteName' already points at ADO."
  }
} else {
  Write-Host "Adding remote '$RemoteName' → $CloneUrl"
  git remote add $RemoteName $CloneUrl
}

Write-Host "Pushing $Branch to $RemoteName ..."
git push -u $RemoteName $Branch
if ($LASTEXITCODE -ne 0) {
  Write-Error "Push failed. Check ADO permissions / sign-in (ADO PAT or credential manager)."
}

Write-Host "Done. Public origin unchanged; internal mirror updated."
git remote -v
