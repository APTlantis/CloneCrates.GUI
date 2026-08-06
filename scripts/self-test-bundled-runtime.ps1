param(
    [string]$WorkRoot = "$env:TEMP\clone-crates-gui-self-test",
    [int]$Limit = 5,
    [switch]$KeepWorkRoot
)

$ErrorActionPreference = "Stop"

function Step($Message) {
    Write-Host ""
    Write-Host "== $Message =="
}

function Require-File($Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file not found: $Path"
    }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )

    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Exe $($Arguments -join ' ')"
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$resources = Join-Path $projectRoot "src-tauri\resources"
$tools = Join-Path $resources "bin"
$portableGit = Join-Path $resources "portable-git"

$gitExe = Join-Path $portableGit "cmd\git.exe"
$gitExecPath = Join-Path $portableGit "mingw64\libexec\git-core"
$gitCaInfo = Join-Path $portableGit "mingw64\etc\ssl\certs\ca-bundle.crt"
$downloadExe = Join-Path $tools "download-crates.exe"
$sidecarsExe = Join-Path $tools "generate-sidecars.exe"
$extractExe = Join-Path $tools "extract-bundles.exe"

Require-File $gitExe
Require-File $gitCaInfo
Require-File $downloadExe
Require-File $sidecarsExe
Require-File $extractExe

if ((Test-Path -LiteralPath $WorkRoot) -and -not $KeepWorkRoot) {
    Remove-Item -LiteralPath $WorkRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $WorkRoot | Out-Null

$env:GIT_EXEC_PATH = $gitExecPath
$env:GIT_SSL_CAINFO = $gitCaInfo
$env:PATH = @(
    (Join-Path $portableGit "cmd"),
    (Join-Path $portableGit "mingw64\bin"),
    (Join-Path $portableGit "usr\bin"),
    (Join-Path $portableGit "bin"),
    $tools,
    "$env:SystemRoot\System32",
    $env:SystemRoot
) -join ";"

$allowedRoots = @(
    (Resolve-Path -LiteralPath $portableGit).Path,
    (Resolve-Path -LiteralPath $tools).Path
)

$blocked = @("git", "go", "python", "gh") | ForEach-Object {
    $cmd = Get-Command $_ -ErrorAction SilentlyContinue
    if ($cmd) {
        $source = $cmd.Source
        $allowed = $false
        foreach ($root in $allowedRoots) {
            if ($source -and $source.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $allowed = $true
            }
        }
        if (-not $allowed) { "$_ -> $source" }
    }
}
if ($blocked) {
    throw "Host tool leaked into isolated PATH: $($blocked -join ', ')"
}

$indexDir = Join-Path $WorkRoot "crates.io-index"
$mirrorDir = Join-Path $WorkRoot "mirror"
$manifest = Join-Path $WorkRoot "manifest.jsonl"
$sidecars = Join-Path $WorkRoot "sidecars.jsonl"
$bundleWork = Join-Path $WorkRoot "bundle-work"
$bundles = Join-Path $WorkRoot "bundles"
$restored = Join-Path $WorkRoot "restored"

Step "Bundled tool versions"
Invoke-Native -Exe $gitExe -Arguments @("--version")
Invoke-Native -Exe $downloadExe -Arguments @("-version")
Invoke-Native -Exe $sidecarsExe -Arguments @("-version")
Invoke-Native -Exe $extractExe -Arguments @("-version")

Step "Bundled Git HTTPS check"
Invoke-Native -Exe $gitExe -Arguments @("ls-remote", "https://github.com/rust-lang/crates.io-index.git", "HEAD")

Step "Clone crates.io index with bundled Git"
if (Test-Path -LiteralPath (Join-Path $indexDir ".git") -PathType Container) {
    Invoke-Native -Exe $gitExe -Arguments @("-C", $indexDir, "rev-parse", "--short", "HEAD")
} else {
    Invoke-Native -Exe $gitExe -Arguments @("clone", "--depth", "1", "https://github.com/rust-lang/crates.io-index.git", $indexDir)
}

Step "Downloader dry run"
Invoke-Native -Exe $downloadExe -Arguments @("-index-dir", $indexDir, "-out", $mirrorDir, "-manifest", $manifest, "-limit", "$Limit", "-dry-run", "-listen", "127.0.0.1:0")

Step "Limited loose-file download"
Invoke-Native -Exe $downloadExe -Arguments @("-index-dir", $indexDir, "-out", $mirrorDir, "-manifest", $manifest, "-limit", "$Limit", "-concurrency", "4", "-listen", "127.0.0.1:0", "-progress-every", "1")

Step "Sidecar JSONL generation"
Invoke-Native -Exe $sidecarsExe -Arguments @("-index-dir", $indexDir, "-output-mode", "jsonl", "-jsonl-out", $sidecars, "-manifest", $manifest, "-limit", "$Limit", "-concurrency", "4")

Step "Limited bundle download"
$bundleManifest = Join-Path $WorkRoot "bundle-manifest.jsonl"
Invoke-Native -Exe $downloadExe -Arguments @("-index-dir", $indexDir, "-out", $bundleWork, "-manifest", $bundleManifest, "-limit", "$Limit", "-concurrency", "4", "-bundle", "-bundle-mode", "only", "-bundle-size-gb", "1", "-bundles-out", $bundles, "-listen", "127.0.0.1:0")

Step "Bundle extraction"
Invoke-Native -Exe $extractExe -Arguments @("-bundles-dir", $bundles, "-out", $restored)

Step "Artifact summary"
$summary = [ordered]@{
    WorkRoot = $WorkRoot
    MirrorCrates = (Get-ChildItem -LiteralPath $mirrorDir -Recurse -Filter "*.crate" -File | Measure-Object).Count
    ManifestLines = (Get-Content -LiteralPath $manifest | Measure-Object -Line).Lines
    SidecarLines = (Get-Content -LiteralPath $sidecars | Measure-Object -Line).Lines
    Bundles = (Get-ChildItem -LiteralPath $bundles -Filter "*.tar.zst" -File | Measure-Object).Count
    RestoredCrates = (Get-ChildItem -LiteralPath $restored -Recurse -Filter "*.crate" -File | Measure-Object).Count
}
$summary.GetEnumerator() | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }

if ($summary.MirrorCrates -lt 1) { throw "No loose crate files were downloaded." }
if ($summary.ManifestLines -lt 1) { throw "Manifest was empty." }
if ($summary.SidecarLines -lt 1) { throw "Sidecar JSONL was empty." }
if ($summary.Bundles -lt 1) { throw "No bundle archives were produced." }
if ($summary.RestoredCrates -lt 1) { throw "No crate files were restored from bundles." }

Write-Host ""
Write-Host "SELF TEST PASSED"
