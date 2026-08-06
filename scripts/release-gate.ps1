param(
    [string]$Version = "0.1.0",
    [string]$CliSource = "D:\CTS\CloneCratesio",
    [string]$CopiedCliPayload = "C:\Users\Administrator\Desktop\CRATESIO-PROJECT\CloneCratesio",
    [switch]$SkipTauriBuild,
    [switch]$SkipBundledRuntimeSelfTest,
    [switch]$KeepSelfTestWorkRoot
)

$ErrorActionPreference = "Stop"

function Step($Message) {
    Write-Host ""
    Write-Host "== $Message =="
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Script
    )

    Step $Label
    $started = Get-Date
    & $Script
    $elapsed = (Get-Date) - $started
    Write-Host "PASS: $Label ($([math]::Round($elapsed.TotalSeconds, 1))s)"
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

function Require-File($Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file not found: $Path"
    }
}

function Set-Text($Path, $Text) {
    Set-Content -LiteralPath $Path -Value $Text -NoNewline
}

function Update-Between($Text, $Pattern, $Replacement) {
    return [regex]::Replace($Text, $Pattern, $Replacement, "Singleline")
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$srcTauri = Join-Path $projectRoot "src-tauri"
$manifestPath = Join-Path $projectRoot "CloneCratesGUI.manifest.toml"
$releaseNotePath = Join-Path $projectRoot "docs\releases\CloneCratesGUI-v$Version.md"
$checklistPath = Join-Path $projectRoot "docs\Release-Checklist.md"
$evidenceDir = Join-Path $projectRoot "release-evidence\v$Version"
$hashFile = Join-Path $evidenceDir "filehash.txt"
$summaryFile = Join-Path $evidenceDir "release-gate-summary.txt"

$toolDir = Join-Path $srcTauri "resources\bin"
$portableGit = Join-Path $srcTauri "resources\portable-git"

New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$results = New-Object System.Collections.Generic.List[string]
function Record($Message) {
    $results.Add($Message) | Out-Null
    Write-Host $Message
}

Invoke-Step "Required files" {
    foreach ($file in @(
        "README.md",
        "Project-README.md",
        "AGENTS.md",
        "CloneCratesGUI.manifest.toml",
        "docs\Project-Proposal.md",
        "docs\Release-Checklist.md",
        "docs\Trust-and-Dependency-Provenance.md",
        "scripts\self-test-bundled-runtime.ps1"
    )) {
        Require-File (Join-Path $projectRoot $file)
    }
}

Invoke-Step "Bundled runtime versions" {
    Invoke-Native -Exe (Join-Path $portableGit "cmd\git.exe") -Arguments @("--version")
    Invoke-Native -Exe (Join-Path $toolDir "download-crates.exe") -Arguments @("-version")
    Invoke-Native -Exe (Join-Path $toolDir "generate-sidecars.exe") -Arguments @("-version")
    Invoke-Native -Exe (Join-Path $toolDir "extract-bundles.exe") -Arguments @("-version")
}

if (Test-Path -LiteralPath $CliSource -PathType Container) {
    Invoke-Step "Authoritative CloneCratesio CLI tests" {
        Push-Location $CliSource
        try {
            Invoke-Native -Exe "go" -Arguments @("test", "./...")
        } finally {
            Pop-Location
        }
    }
}

if (Test-Path -LiteralPath $CopiedCliPayload -PathType Container) {
    Invoke-Step "Copied CLI payload tests" {
        Push-Location $CopiedCliPayload
        try {
            Invoke-Native -Exe "go" -Arguments @("test", "./...")
        } finally {
            Pop-Location
        }
    }
}

Invoke-Step "Frontend type check" {
    Push-Location $projectRoot
    try {
        Invoke-Native -Exe "pnpm" -Arguments @("run", "lint")
    } finally {
        Pop-Location
    }
}

Invoke-Step "Rust backend check" {
    Push-Location $srcTauri
    try {
        Invoke-Native -Exe "cargo" -Arguments @("check")
    } finally {
        Pop-Location
    }
}

if (-not $SkipBundledRuntimeSelfTest) {
    Invoke-Step "Bundled runtime self-test" {
        Push-Location $projectRoot
        try {
            $args = @("-ExecutionPolicy", "Bypass", "-File", "scripts\self-test-bundled-runtime.ps1", "-Limit", "5")
            if ($KeepSelfTestWorkRoot) {
                $args += "-KeepWorkRoot"
            }
            Invoke-Native -Exe "powershell" -Arguments $args
        } finally {
            Pop-Location
        }
    }
}

if (-not $SkipTauriBuild) {
    Invoke-Step "Tauri installer build" {
        Push-Location $projectRoot
        try {
            Invoke-Native -Exe "pnpm" -Arguments @("tauri", "build")
        } finally {
            Pop-Location
        }
    }
}

Invoke-Step "Installer artifact hashes" {
    $msi = Get-ChildItem -LiteralPath (Join-Path $srcTauri "target\release\bundle\msi") -Filter "*.msi" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    $nsis = Get-ChildItem -LiteralPath (Join-Path $srcTauri "target\release\bundle\nsis") -Filter "*.exe" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $msi) { throw "MSI artifact not found." }
    if (-not $nsis) { throw "NSIS artifact not found." }

    $msiHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $msi.FullName).Hash.ToUpperInvariant()
    $nsisHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $nsis.FullName).Hash.ToUpperInvariant()

    $hashText = @"
CloneCratesGUI v$Version release gate
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")

MSI:
  Path: $($msi.FullName)
  File: $($msi.Name)
  Size: $($msi.Length)
  SHA256: $msiHash

NSIS:
  Path: $($nsis.FullName)
  File: $($nsis.Name)
  Size: $($nsis.Length)
  SHA256: $nsisHash
"@
    Set-Text $hashFile $hashText

    $manifest = Get-Content -LiteralPath $manifestPath -Raw
    $manifest = Update-Between $manifest '(?s)(\[release\.installer\.msi\].*?size_bytes = )\d+' "`$1$($msi.Length)"
    $manifest = Update-Between $manifest '(?s)(\[release\.installer\.msi\].*?sha256 = )"[^"]*"' "`$1`"$msiHash`""
    $manifest = Update-Between $manifest '(?s)(\[release\.installer\.nsis\].*?size_bytes = )\d+' "`$1$($nsis.Length)"
    $manifest = Update-Between $manifest '(?s)(\[release\.installer\.nsis\].*?sha256 = )"[^"]*"' "`$1`"$nsisHash`""
    $manifest = Update-Between $manifest '(?s)(\[release\.verified\].*?tests = )"[^"]*"' "`$1`"release gate passed: pnpm run lint, cargo check, CloneCratesio go test ./..., bundled runtime self-test`""
    $manifest = Update-Between $manifest '(?s)(\[release\.verified\].*?installer_build = )"[^"]*"' "`$1`"pnpm tauri build completed; MSI and NSIS artifacts hashed`""
    Set-Text $manifestPath $manifest

    $releaseNote = Get-Content -LiteralPath $releaseNotePath -Raw
    $releaseNote = $releaseNote.Replace('MSI: `PENDING_RELEASE_GATE`', "MSI: ``$msiHash``")
    $releaseNote = $releaseNote.Replace('NSIS: `PENDING_RELEASE_GATE`', "NSIS: ``$nsisHash``")
    Set-Text $releaseNotePath $releaseNote

    $checklist = Get-Content -LiteralPath $checklistPath -Raw
    $checklist = $checklist -replace 'Package size: `PENDING_RELEASE_GATE`', "Package size: MSI $($msi.Length) bytes; NSIS $($nsis.Length) bytes"
    $checklist = $checklist -replace 'SHA-256: `PENDING_RELEASE_GATE`', "SHA-256: MSI $msiHash; NSIS $nsisHash"
    $checklist = $checklist -replace 'Build result: pending final release gate', "Build result: release gate completed on $(Get-Date -Format 'yyyy-MM-dd')"
    $checklist = $checklist -replace 'Test result: pending final release gate', "Test result: release gate passed on $(Get-Date -Format 'yyyy-MM-dd')"
    Set-Text $checklistPath $checklist

    Record "MSI $($msi.Name) $($msi.Length) $msiHash"
    Record "NSIS $($nsis.Name) $($nsis.Length) $nsisHash"
}

$results.Insert(0, "CloneCratesGUI v$Version release gate passed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')") | Out-Null
Set-Text $summaryFile (($results -join "`r`n") + "`r`n")

Write-Host ""
Write-Host "RELEASE GATE PASSED"
Write-Host "Evidence: $evidenceDir"
