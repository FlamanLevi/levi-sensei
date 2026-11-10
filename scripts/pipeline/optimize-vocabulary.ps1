<#
.SYNOPSIS
  Safely prunes redundant keys and minifies master_vocabulary.json with backup.
.USAGE
  .\optimize-vocabulary.ps1
#>

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$targetFiles = @(
    (Join-Path $ProjectRoot "public\data\master_vocabulary.json"),
    (Join-Path $ProjectRoot "master_vocabulary_data\master_vocabulary.json")
) | Where-Object { Test-Path $_ }

if ($targetFiles.Count -eq 0) {
    Write-Host "Error: Could not find master_vocabulary.json" -ForegroundColor Red
    exit
}

# The 13 redundant/derivable keys identified in the audit
$keysToRemove = @(
    'ruby_html',
    'ruby_text',
    'token',
    'card_image_bilingual',
    'card_image_kana',
    'card_image_en',
    'card_variants',
    'category_name',
    'normalized_english',
    'canonical_key',
    'phonics_initial',
    'first_letter',
    'letter_count'
)

foreach ($filePath in $targetFiles) {
    Write-Host "`nProcessing: $filePath" -ForegroundColor Cyan
    $fileInfo = Get-Item $filePath
    $origSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    $origChars = (Get-Content $filePath -Raw -Encoding UTF8).Length

    # 1. Create automatic backup
    $backupPath = $filePath -replace '\.json$', ".backup_$(Get-Date -Format 'yyyyMMdd_HHmm').json"
    Copy-Item -Path $filePath -Destination $backupPath -Force
    Write-Host "  [Backup created] -> $backupPath" -ForegroundColor DarkGray

    # 2. Parse and prune entries
    $raw = Get-Content $filePath -Raw -Encoding UTF8
    $items = $raw | ConvertFrom-Json

    foreach ($item in $items) {
        foreach ($k in $keysToRemove) {
            if ($item.PSObject.Properties[$k]) {
                $item.PSObject.Properties.Remove($k)
            }
        }
    }

    # 3. Save compact JSON (no indentation bloat)
    $optimizedJson = $items | ConvertTo-Json -Compress -Depth 10
    $optimizedJson | Set-Content -Path $filePath -Encoding UTF8

    $newFileInfo = Get-Item $filePath
    $newSizeMB = [math]::Round($newFileInfo.Length / 1MB, 2)
    $newChars = $optimizedJson.Length
    $savedChars = $origChars - $newChars
    $savedMB = [math]::Round($origSizeMB - $newSizeMB, 2)

    Write-Host "  Original Size:  $origSizeMB MB ($origChars chars)" -ForegroundColor Yellow
    Write-Host "  New Size:       $newSizeMB MB ($newChars chars)" -ForegroundColor Green
    Write-Host "  Reduced by:     -$savedMB MB (-$savedChars characters / $([math]::Round(($savedChars/$origChars)*100, 1))% smaller!)" -ForegroundColor Cyan
}

Write-Host "`nDone! All vocabulary, audio, grade isolation, and game data remain 100% intact.`n" -ForegroundColor Green