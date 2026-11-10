<#
.SYNOPSIS
  Selectively bundles Levi-Sensei source code into a text file for Google AI Studio.
.USAGE
  # 1. Interactive multi-select mode:
  powershell -ExecutionPolicy Bypass -File bundle-for-ai-studio.ps1
  (When prompted, type: 1, 2, 3)

  # 2. Command-line flags (multi-target support):
  .\bundle-for-ai-studio.ps1 -Focus shell,student,quiz
  .\bundle-for-ai-studio.ps1 -Focus 1,2,3 -Lean
  .\bundle-for-ai-studio.ps1 -All
#>

param(
    [Parameter(Position = 0)]
    [string[]]$Focus = @(),
    [switch]$All = $false,
    [switch]$Lean = $false,       # Omits heavy audio synthesizers and the 1,300-line game registry
    [switch]$NoConfig = $false    # Omits package.json, vite.config.ts, firebase.json, etc.
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputFile  = Join-Path ([Environment]::GetFolderPath('Desktop')) 'levi-sensei-bundle.txt'
$Sep         = "`n" + ("=" * 80) + "`n"

function Append-Section($Header, $Content) {
    "${Sep}# FILE: ${Header}${Sep}${Content}`n" | Add-Content $OutputFile -Encoding UTF8
}

# --- Module Definitions ---
$ModuleMap = [ordered]@{
    "1" = @{ Key = "shell";         Name = "Shell & Core UI (Header, Navigation, FilterBar, Modals)"; Patterns = @('^src/components/shell/', '^src/components/common/') }
    "2" = @{ Key = "student";       Name = "Student Portal & Device Linker (SSO, Roster, Badges)";   Patterns = @('^src/components/student/', '^src/services/studentProfile\.ts$') }
    "3" = @{ Key = "quiz";          Name = "Eigo Arena / Quiz (Kahoot, Sprint Race, Host & Student)"; Patterns = @('^src/games/quiz/') }
    "4" = @{ Key = "clock";         Name = "Clock Master Game (AnalogClock, DigitalClock)";           Patterns = @('^src/games/clock/') }
    "5" = @{ Key = "bingo";         Name = "Live Classroom Bingo & Printables";                       Patterns = @('^src/games/bingo/') }
    "6" = @{ Key = "concentration"; Name = "Concentration (3D Memory Match)";                         Patterns = @('^src/games/concentration/') }
    "7" = @{ Key = "missing";       Name = "What's Missing? (Curtains & Choral Repetition)";         Patterns = @('^src/games/missing/') }
    "8" = @{ Key = "timebomb";      Name = "Hot Potato / Pop Relay / Timebomb";                       Patterns = @('^src/games/timebomb/') }
    "9" = @{ Key = "other_games";   Name = "Other Games (Pixel Reveal, Speed Flash, 3-Hints, Keyword)"; Patterns = @('^src/games/(pixel_reveal|speed_flash|three_hints|keyword)/') }
}

# Flatten parameters if passed as comma-separated string e.g. -Focus "shell,student"
if ($Focus.Count -eq 1 -and $Focus[0] -match ',') {
    $Focus = $Focus[0] -split ',' | ForEach-Object { $_.Trim() }
}

# --- 1. Interactive Menu if no arguments passed ---
if ($Focus.Count -eq 0 -and -not $All) {
    Write-Host ""
    Write-Host "=== LEVI-SENSEI AI STUDIO BUNDLER ===" -ForegroundColor Cyan
    Write-Host "Select the components you are working on. You can choose MULTIPLE (e.g. 1, 2, 3):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [0] Full Codebase (All games & tools - 150k+ tokens)"
    foreach ($k in $ModuleMap.Keys) {
        Write-Host "  [$k] $($ModuleMap[$k].Name)"
    }
    Write-Host ""
    $rawChoice = Read-Host "Enter selection [0-9 or comma-separated list] (Default: 1)"
    if (-not $rawChoice) { $rawChoice = "1" }

    $tokens = $rawChoice -split '[,+\s]+' | Where-Object { $_ }

    if ($tokens -contains "0") {
        $All = $true
    } else {
        foreach ($t in $tokens) {
            $t = $t.Trim()
            if ($ModuleMap.Contains($t)) {
                $Focus += $ModuleMap[$t].Key
            } elseif ($ModuleMap.Values.Key -contains $t.ToLower()) {
                $Focus += $t.ToLower()
            } else {
                $Focus += $t.ToLower()
            }
        }

        # Prompt for Lean Mode to save tokens
        Write-Host ""
        $leanPrompt = Read-Host "Skip heavy infrastructure (Audio synthesizers, 1,300-line game registry)? [Y/n] (Default: Y)"
        if ($leanPrompt -notmatch '^[nN]') {
            $Lean = $true
        }
    }
}

# Resolve any numeric IDs in $Focus (e.g. if passed as -Focus 1,2,3 from CLI)
$resolvedFocus = @()
foreach ($item in $Focus) {
    $itemStr = "$item".Trim()
    if ($ModuleMap.Contains($itemStr)) {
        $resolvedFocus += $ModuleMap[$itemStr].Key
    } else {
        $resolvedFocus += $itemStr.ToLower()
    }
}
$Focus = $resolvedFocus

# --- 2. Initialize Output Header ---
$targetDesc = if ($All) { "FULL PROJECT DUMP" } else { "MULTI-TARGET: $($Focus -join ' + ')" }
if ($Lean) { $targetDesc += " [LEAN CORE]" }

$header = "LEVI-SENSEI ENGLISH PLATFORM - SOURCE BUNDLE`nTarget Scope: $targetDesc`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`nRead the GEMINI.md rules section first.`n"
$header | Set-Content $OutputFile -Encoding UTF8

Write-Host "`nBundling for: $targetDesc..." -ForegroundColor Cyan

# --- 3. Always include Invariant Rules (GEMINI.md) ---
$gPath = Join-Path $ProjectRoot 'GEMINI.md'
if (Test-Path $gPath) {
    Append-Section 'GEMINI.md' (Get-Content $gPath -Raw -Encoding UTF8)
}

# --- 4. Configuration Files ---
if (-not $NoConfig) {
    $configs = @('package.json', 'tsconfig.json', 'vite.config.ts', 'tailwind.config.js', 'index.html', 'firebase.json')
    foreach ($cf in $configs) {
        $p = Join-Path $ProjectRoot $cf
        if (Test-Path $p) {
            Append-Section $cf (Get-Content $p -Raw -Encoding UTF8)
        }
    }
}

# --- 5. Project Directory Structure Map ---
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

# Determine active regex patterns from all selected modules
$activePatterns = [System.Collections.Generic.List[string]]::new()

foreach ($item in $Focus) {
    $matched = $false
    foreach ($k in $ModuleMap.Keys) {
        if ($ModuleMap[$k].Key -eq $item) {
            $ModuleMap[$k].Patterns | ForEach-Object { $activePatterns.Add($_) }
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        # Custom keyword (e.g. "clock", "pixel")
        $activePatterns.Add("^src/games/$item/")
        $activePatterns.Add("$item")
    }
}

$selectedFileMap = [ordered]@{}

foreach ($f in $allSourceFiles) {
    $rel = $f.FullName.Replace("$ProjectRoot\", '').Replace('\', '/')

    if ($All) {
        $selectedFileMap[$rel] = $f
        continue
    }

    # Core Lightweight Files (Always included for state and context awareness)
    $isLightCore = ($rel -match '^src/(App|main)\.tsx$') -or
                   ($rel -match '^src/context/(Classroom|Language|Vocabulary|Audio)Context\.tsx$') -or
                   ($rel -match '^src/types/roster\.ts$') -or
                   ($rel -match '^src/services/firebase\.ts$')

    # Core Heavy Files (Excluded in -Lean mode to save ~25,000+ tokens)
    $isHeavyCore = ($rel -match '^src/services/(rtdbSafe|speechService|soundEffects)\.ts$') -or
                   ($rel -match '^src/games/registry\.ts$') -or
                   ($rel -eq 'src/index.css')

    # Target Feature Match
    $isTarget = $false
    foreach ($pattern in $activePatterns) {
        if ($rel -match $pattern) {
            $isTarget = $true
            break
        }
    }

    if ($isTarget -or $isLightCore -or (-not $Lean -and $isHeavyCore)) {
        $selectedFileMap[$rel] = $f
    }
}

# Dump selected source files (Deduplicated automatically)
$total = $selectedFileMap.Count
$i = 0
foreach ($rel in $selectedFileMap.Keys) {
    $i++
    $fileObj = $selectedFileMap[$rel]
    $body = Get-Content $fileObj.FullName -Raw -Encoding UTF8
    $lines = ($body -split "`n").Count
    Append-Section "$rel  [$lines lines]" $body
    Write-Progress -Activity 'Bundling Source Code' -Status $rel -PercentComplete (($i / $total) * 100)
}
Write-Progress -Activity 'Bundling Source Code' -Completed

# --- 7. Vocabulary Structure Preview ---
$typesFile = Join-Path $ProjectRoot 'master_vocabulary_data\types.ts'
if (Test-Path $typesFile) {
    Append-Section 'master_vocabulary_data/types.ts' (Get-Content $typesFile -Raw -Encoding UTF8)
}

# --- 8. Summary & Token Analytics ---
$finalBytes = (Get-Item $OutputFile).Length
$finalMB = [math]::Round($finalBytes / 1MB, 2)
$estTokens = [math]::Round($finalBytes / 3.8)
$allBytes = ($allSourceFiles | Measure-Object -Property Length -Sum).Sum
$totalTokens = [math]::Round($allBytes / 3.8)
$savedTokens = [math]::Max(0, $totalTokens - $estTokens)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Bundle created successfully at:" -ForegroundColor Green
Write-Host "  $OutputFile" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Scope:       $targetDesc"
Write-Host "  Files:       $total bundled (out of $($allSourceFiles.Count) total)"
Write-Host "  File Size:   $finalMB MB"
Write-Host "  Tokens:      ~$estTokens estimated tokens" -ForegroundColor Yellow
if (-not $All) {
    Write-Host "  Savings:     ~$savedTokens tokens saved vs full project dump!" -ForegroundColor Green
}
Write-Host "==========================================================" -ForegroundColor Green