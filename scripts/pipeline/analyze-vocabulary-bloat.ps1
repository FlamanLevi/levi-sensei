<#
.SYNOPSIS
  Read-only analyzer for master_vocabulary.json bloat and optimization potential.
.USAGE
  .\analyze-vocabulary-bloat.ps1
#>

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Locate the vocabulary JSON file
$candidates = @(
    (Join-Path $ProjectRoot "public\data\master_vocabulary.json"),
    (Join-Path $ProjectRoot "master_vocabulary_data\master_vocabulary.json")
)

$targetFile = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $targetFile) {
    Write-Host "Error: Could not find master_vocabulary.json." -ForegroundColor Red
    exit
}

Write-Host "`nAnalyzing: $targetFile..." -ForegroundColor Cyan

# 2. Read raw file size
$fileInfo = Get-Item $targetFile
$rawContent = Get-Content $targetFile -Raw -Encoding UTF8
$rawChars = $rawContent.Length
$rawMB = [math]::Round($fileInfo.Length / 1MB, 2)

Write-Host "File Size: $rawMB MB ($rawChars characters)" -ForegroundColor Gray

# 3. Parse JSON
$items = $rawContent | ConvertFrom-Json
$itemCount = $items.Count

Write-Host "Total Vocabulary Entries: $itemCount words`n" -ForegroundColor Gray

# 4. Property character audit
$propStats = @{}

# List of known derivable or redundant keys
$derivableKeys = @('letter_count', 'first_letter', 'normalized_english', 'category_name', 'phonics_initial', 'canonical_key', 'token')
$redundantKeys = @('ruby_html', 'ruby_text', 'card_variants', 'card_image_kana', 'card_image_en', 'card_image_bilingual')

foreach ($item in $items) {
    $props = $item.PSObject.Properties
    foreach ($p in $props) {
        $name = $p.Name
        if (-not $propStats.ContainsKey($name)) {
            $propStats[$name] = [PSCustomObject]@{
                Name            = $name
                TotalChars      = 0
                EmptyOrNullCount = 0
                FilledCount     = 0
                Type            = ""
            }
        }

        $val = $p.Value
        $valJson = $val | ConvertTo-Json -Compress -Depth 5
        $entryChars = $name.Length + 4 + ($valJson.Length)

        $propStats[$name].TotalChars += $entryChars

        if ($null -eq $val -or $val -eq "" -or ($val -is [System.Array] -and $val.Count -eq 0)) {
            $propStats[$name].EmptyOrNullCount++
        } else {
            $propStats[$name].FilledCount++
        }
    }
}

# 5. Format results table
$results = $propStats.Values | ForEach-Object {
    $pct = [math]::Round(($_.TotalChars / $rawChars) * 100, 2)
    $charsKB = [math]::Round($_.TotalChars / 1KB, 1)

    $status = "Essential"
    if ($redundantKeys -contains $_.Name) {
        $status = "REDUNDANT"
    } elseif ($derivableKeys -contains $_.Name) {
        $status = "DERIVABLE"
    } elseif ($_.EmptyOrNullCount -gt ($itemCount * 0.85)) {
        $status = "MOSTLY EMPTY"
    }

    [PSCustomObject]@{
        Field            = $_.Name
        "Size (KB)"      = $charsKB
        "File %"         = "$pct %"
        "Empty/Null"     = "$($_.EmptyOrNullCount) / $itemCount"
        "Recommendation" = $status
    }
} | Sort-Object { [double]($_."File %".Replace('%','').Trim()) } -Descending

# Print Ranked Table
$results | Format-Table -AutoSize

# 6. Calculate potential savings
$prunable = $results | Where-Object { $_.Recommendation -in @('REDUNDANT', 'DERIVABLE', 'MOSTLY EMPTY') }
$prunableChars = ($prunable | Measure-Object -Property "Size (KB)" -Sum).Sum * 1KB

# Test minified whitespace size (removing pretty-print indentation)
$minifiedJson = $items | ConvertTo-Json -Compress -Depth 10
$minifiedChars = $minifiedJson.Length
$whitespaceChars = $rawChars - $minifiedChars
$whitespaceKB = [math]::Round($whitespaceChars / 1KB, 1)

$totalPotentialSavingsKB = [math]::Round(($prunableChars + $whitespaceChars) / 1KB, 1)
$cleanProjectedKB = [math]::Round(($rawChars - ($prunableChars + $whitespaceChars)) / 1KB, 1)
$cleanProjectedMB = [math]::Round($cleanProjectedKB / 1024, 2)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "                 BLOAT AUDIT SUMMARY                      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Current Raw File Size:       $rawMB MB ($rawChars characters)"
Write-Host "  Indent Whitespace Bloat:     ~$whitespaceKB KB" -ForegroundColor Red
Write-Host "  Redundant / Derivable Keys:  ~$([math]::Round($prunableChars / 1KB, 1)) KB" -ForegroundColor Red
Write-Host "----------------------------------------------------------"
Write-Host "  Total Potential Savings:     ~$totalPotentialSavingsKB KB" -ForegroundColor Green
Write-Host "  Projected Optimized Size:    ~$cleanProjectedMB MB (~$cleanProjectedKB KB)" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Green