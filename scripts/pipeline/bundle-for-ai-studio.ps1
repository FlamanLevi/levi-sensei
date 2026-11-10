<#
.SYNOPSIS
  Bundles Levi-Sensei source code into a single text file for Google AI Studio.
.USAGE
  powershell -ExecutionPolicy Bypass -File bundle-for-ai-studio.ps1
#>

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputFile  = Join-Path ([Environment]::GetFolderPath('Desktop')) 'levi-sensei-bundle.txt'
$Sep         = "`n" + ("=" * 80) + "`n"

function Append-Section($Header, $Content) {
    "${Sep}# FILE: ${Header}${Sep}${Content}`n" | Add-Content $OutputFile -Encoding UTF8
}

# Init output
$header = "LEVI-SENSEI ENGLISH PLATFORM - SOURCE BUNDLE`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`nRead the GEMINI.md rules section first.`n"
$header | Set-Content $OutputFile -Encoding UTF8

# GEMINI.md
$gPath = Join-Path $ProjectRoot 'GEMINI.md'
if (Test-Path $gPath) {
    Append-Section 'GEMINI.md' (Get-Content $gPath -Raw -Encoding UTF8)
}

# Config files
$configs = @('package.json','tsconfig.json','vite.config.ts','tailwind.config.js','index.html','firebase.json','.firebaserc')
foreach ($cf in $configs) {
    $p = Join-Path $ProjectRoot $cf
    if (Test-Path $p) {
        Append-Section $cf (Get-Content $p -Raw -Encoding UTF8)
    }
}

# Games Master Blueprint
$bp = Get-ChildItem $ProjectRoot -Filter '*GAMES_MASTER_BLUEPRINT*' -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($bp) {
    Append-Section $bp.Name (Get-Content $bp.FullName -Raw -Encoding UTF8)
}

# All source files
$srcDir = Join-Path $ProjectRoot 'src'
$files = Get-ChildItem $srcDir -Recurse -Include *.ts,*.tsx,*.css -File | Sort-Object FullName
$total = $files.Count
$i = 0

foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Replace("$ProjectRoot\", '').Replace('\', '/')
    $body = Get-Content $f.FullName -Raw -Encoding UTF8
    $lines = ($body -split "`n").Count
    Append-Section "$rel  [$lines lines]" $body
    Write-Progress -Activity 'Bundling' -Status $rel -PercentComplete (($i / $total) * 100)
}

# JSON data files
$dataDir = Join-Path $ProjectRoot 'public\data'
if (Test-Path $dataDir) {
    Get-ChildItem $dataDir -Filter *.json -File -ErrorAction SilentlyContinue | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $label = "public/data/$($_.Name) [$sizeMB MB]"
        if ($_.Length -lt 500KB) {
            Append-Section $label (Get-Content $_.FullName -Raw -Encoding UTF8)
        } else {
            $preview = Get-Content $_.FullName -TotalCount 50 -Encoding UTF8 | Out-String
            Append-Section "$label PREVIEW" $preview
        }
    }
}

Write-Progress -Activity 'Bundling' -Completed
$finalMB = [math]::Round((Get-Item $OutputFile).Length / 1MB, 2)
Write-Host ""
Write-Host "  Done! Bundle saved to: $OutputFile"
Write-Host "  Size: $finalMB MB | Files: $total source + configs"
Write-Host ""
Write-Host "  Next: upload to https://aistudio.google.com"
Write-Host ""
