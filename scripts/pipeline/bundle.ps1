<#
.SYNOPSIS
  Selectively bundles Levi-Sensei source code into a text file for Google AI Studio.
.USAGE
  # 1. Interactive mode (asks you what you're working on):
  powershell -ExecutionPolicy Bypass -File bundle-for-ai-studio.ps1

  # 2. Command-line flags (instant targeted dump):
  .\bundle-for-ai-studio.ps1 -Focus clock
  .\bundle-for-ai-studio.ps1 -Focus quiz
  .\bundle-for-ai-studio.ps1 -Focus shell
  .\bundle-for-ai-studio.ps1 -Focus student
  .\bundle-for-ai-studio.ps1 -All
#>

param(
    [Parameter(Position = 0)]
    [string]$Focus = "",
    [switch]$All = $false
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputFile  = Join-Path ([Environment]::GetFolderPath('Desktop')) 'levi-sensei-bundle.txt'
$Sep         = "`n" + ("=" * 80) + "`n"

function Append-Section($Header, $Content) {
    "${Sep}# FILE: ${Header}${Sep}${Content}`n" | Add-Content $OutputFile -Encoding UTF8
}

# --- 1. Interactive Menu if no arguments passed ---
$availableGames = @('clock', 'quiz', 'bingo', 'concentration', 'missing', 'pixel_reveal', 'speed_flash', 'three_hints', 'timebomb', 'keyword')

if (-not $Focus -and -not $All) {
    Write-Host ""
    Write-Host "=== LEVI-SENSEI AI STUDIO BUNDLER ===" -ForegroundColor Cyan
    Write-Host "What feature are you working on in this session?" -ForegroundColor Yellow
    Write-Host "  [0] Full Codebase (All games & tools - 100k+ tokens)"
    Write-Host "  [1] Shell & Core UI only (App, Contexts, Navigation, Modals)"
    Write-Host "  [2] Student Portal & Device Linker (/student, SSO, Roster)"
    Write-Host "  [3] Clock Master Game (AnalogClock, DigitalClock, routines)"
    Write-Host "  [4] Eigo Arena / Quiz (Kahoot, Sprint Race, Host & Student)"
    Write-Host "  [5] Live Classroom Bingo"
    Write-Host "  [6] Concentration (Memory Match)"
    Write-Host "  [7] What's Missing? (Curtains)"
    Write-Host "  [8] Hot Potato / Timebomb"
    Write-Host "  [9] Other Games (Pixel Reveal, Three Hints, Speed Flash, Keyword)"
    Write-Host ""
    $choice = Read-Host "Select an option [0-9] (Default: 1)"

    switch ($choice) {
        "0" { $All = $true }
        "2" { $Focus = "student" }
        "3" { $Focus = "clock" }
        "4" { $Focus = "quiz" }
        "5" { $Focus = "bingo" }
        "6" { $Focus = "concentration" }
        "7" { $Focus = "missing" }
        "8" { $Focus = "timebomb" }
        "9" { 
            Write-Host "Available: $($availableGames -join ', ')" -ForegroundColor DarkCyan
            $Focus = Read-Host "Enter game folder name"
        }
        Default { $Focus = "shell" }
    }
}

# --- 2. Initialize Output Header ---
$targetDesc = if ($All) { "FULL PROJECT DUMP" } elseif ($Focus) { "TARGETED: $Focus" } else { "CORE SHELL" }
$header = "LEVI-SENSEI ENGLISH PLATFORM - SOURCE BUNDLE`nTarget Scope: $targetDesc`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`nRead the GEMINI.md rules section first.`n"
$header | Set-Content $OutputFile -Encoding UTF8

Write-Host "Bundling for: $targetDesc..." -ForegroundColor Cyan

# --- 3. Always include Invariant Rules (GEMINI.md) ---
$gPath = Join-Path $ProjectRoot 'GEMINI.md'
if (Test-Path $gPath) {
    Append-Section 'GEMINI.md' (Get-Content $gPath -Raw -Encoding UTF8)
}

# --- 4. Always include Configuration Files ---
$configs = @('package.json', 'tsconfig.json', 'vite.config.ts', 'tailwind.config.js', 'index.html', 'firebase.json')
foreach ($cf in $configs) {
    $p = Join-Path $ProjectRoot $cf
    if (Test-Path $p) {
        Append-Section $cf (Get-Content $p -Raw -Encoding UTF8)
    }
}

# --- 5. Project Directory Structure Map (Saves tokens while giving AI full structural awareness) ---
Write-Host "Generating Project Map..." -ForegroundColor DarkGray
$treeLines = @("=== PROJECT STRUCTURE TREE (Line counts) ===")
Get-ChildItem -Path (Join-Path $ProjectRoot 'src') -Recurse -Include *.ts,*.tsx,*.css -File | ForEach-Object {
    $rel = $_.FullName.Replace("$ProjectRoot\", '').Replace('\', '/')
    $lines = (Get-Content $_.FullName).Count
    $treeLines += "  - $rel ($lines lines)"
}
Append-Section "PROJECT_MAP.txt" ($treeLines -join "`n")

# --- 6. Selective Source Code Ingestion ---
$srcDir = Join-Path $ProjectRoot 'src'
$allSourceFiles = Get-ChildItem $srcDir -Recurse -Include *.ts,*.tsx,*.css -File | Sort-Object FullName

$selectedFiles = @()

if ($All) {
    $selectedFiles = $allSourceFiles
} else {
    foreach ($f in $allSourceFiles) {
        $rel = $f.FullName.Replace("$ProjectRoot\", '').Replace('\', '/')

        # Core files that are ALWAYS included in targeted runs for structural context:
        $isCore = ($rel -match '^src/(App|main)\.tsx$') -or
                  ($rel -match '^src/context/') -or
                  ($rel -match '^src/types/') -or
                  ($rel -match '^src/services/(firebase|rtdbSafe|speechService|soundEffects)\.ts$') -or
                  ($rel -match '^src/games/registry\.ts$') -or
                  ($rel -eq 'src/index.css')

        if ($Focus -eq "shell") {
            # Shell UI + Modals
            $isShell = $isCore -or ($rel -match '^src/components/shell/') -or ($rel -match '^src/components/common/')
            if ($isShell) { $selectedFiles += $f }
        }
        elseif ($Focus -eq "student") {
            # Student-specific components
            $isStudent = $isCore -or ($rel -match '^src/components/student/') -or ($rel -match '^src/services/studentProfile\.ts$')
            if ($isStudent) { $selectedFiles += $f }
        }
        elseif ($Focus -in $availableGames) {
            # Specific game focused (e.g. src/games/clock/**) + Core shell
            $isTargetGame = ($rel -match "^src/games/$Focus/")
            if ($isCore -or $isTargetGame) { $selectedFiles += $f }
        }
        else {
            # Custom keyword match
            if ($isCore -or ($rel -like "*$Focus*")) { $selectedFiles += $f }
        }
    }
}

# Dump selected source files
$total = $selectedFiles.Count
$i = 0
foreach ($f in $selectedFiles) {
    $i++
    $rel = $f.FullName.Replace("$ProjectRoot\", '').Replace('\', '/')
    $body = Get-Content $f.FullName -Raw -Encoding UTF8
    $lines = ($body -split "`n").Count
    Append-Section "$rel  [$lines lines]" $body
    Write-Progress -Activity 'Bundling Source' -Status $rel -PercentComplete (($i / $total) * 100)
}
Write-Progress -Activity 'Bundling Source' -Completed

# --- 7. Vocabulary Structure Preview (Types only, skip 2MB raw JSON) ---
$typesFile = Join-Path $ProjectRoot 'master_vocabulary_data\types.ts'
if (Test-Path $typesFile) {
    Append-Section 'master_vocabulary_data/types.ts' (Get-Content $typesFile -Raw -Encoding UTF8)
}

# --- 8. Done & Summary ---
$finalBytes = (Get-Item $OutputFile).Length
$finalMB = [math]::Round($finalBytes / 1MB, 2)
$estTokens = [math]::Round($finalBytes / 3.8) # Rough token estimate for code

Write-Host ""
Write-Host "  Bundle created successfully!" -ForegroundColor Green
Write-Host "  Saved to: $OutputFile"
Write-Host "  Scope:    $targetDesc"
Write-Host "  Files:    $total included (out of $($allSourceFiles.Count) total)"
Write-Host "  Size:     $finalMB MB"
Write-Host "  Tokens:   ~$estTokens estimated tokens" -ForegroundColor Yellow
Write-Host ""