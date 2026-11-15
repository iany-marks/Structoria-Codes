param(
  [string]$WorkbookPath = (Join-Path $PSScriptRoot "..\assets\column-design-eurocode.xlsx"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\assets\column-design-model.json")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipXml {
  param($Archive, [string]$Name)
  $entry = $Archive.GetEntry($Name)
  if (-not $entry) { throw "Workbook entry is missing: $Name" }
  $reader = [IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-ColumnNumber {
  param([string]$Letters)
  $number = 0
  foreach ($character in $Letters.ToCharArray()) {
    $number = $number * 26 + ([int][char]$character - [int][char]'A' + 1)
  }
  return $number
}

function Get-CellCoordinates {
  param([string]$Address)
  $match = [regex]::Match($Address, '^([A-Z]+)(\d+)$')
  if (-not $match.Success) { throw "Invalid cell address: $Address" }
  return @{
    column = Get-ColumnNumber $match.Groups[1].Value
    row = [int]$match.Groups[2].Value
  }
}

function Convert-SharedFormula {
  param([string]$Formula, [string]$MasterAddress, [string]$TargetAddress)
  $master = Get-CellCoordinates $MasterAddress
  $target = Get-CellCoordinates $TargetAddress
  $columnOffset = $target.column - $master.column
  $rowOffset = $target.row - $master.row
  $pattern = '"(?:[^"]|"")*"|(?<![A-Z0-9_.])\$?[A-Z]{1,3}\$?\d+(?![A-Z0-9_])'
  return [regex]::Replace($Formula, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{
    param($match)
    if ($match.Value.StartsWith('"')) { return $match.Value }
    $reference = [regex]::Match($match.Value, '^(\$?)([A-Z]{1,3})(\$?)(\d+)$')
    $column = Get-ColumnNumber $reference.Groups[2].Value
    $row = [int]$reference.Groups[4].Value
    if (-not $reference.Groups[1].Success) { $column += $columnOffset }
    if (-not $reference.Groups[3].Success) { $row += $rowOffset }
    if ($column -lt 1 -or $row -lt 1) { return "#REF!" }
    $columnLetters = ""
    while ($column -gt 0) {
      $remainder = ($column - 1) % 26
      $columnLetters = [string][char]([int][char]'A' + $remainder) + $columnLetters
      $column = [math]::Floor(($column - 1) / 26)
    }
    return "$($reference.Groups[1].Value)$columnLetters$($reference.Groups[3].Value)$row"
  })
}

if (-not (Test-Path -LiteralPath $WorkbookPath -PathType Leaf)) {
  throw "The workbook used to build the standalone model was not found: $WorkbookPath"
}

$archive = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($WorkbookPath))
try {
  $workbook = Read-ZipXml $archive "xl/workbook.xml"
  $relationships = Read-ZipXml $archive "xl/_rels/workbook.xml.rels"
  $relationshipTargets = @{}
  foreach ($relationship in $relationships.Relationships.Relationship) {
    $relationshipTargets[$relationship.Id] = $relationship.Target
  }

  $sharedStrings = @()
  $stringsEntry = $archive.GetEntry("xl/sharedStrings.xml")
  if ($stringsEntry) {
    $sharedXml = Read-ZipXml $archive "xl/sharedStrings.xml"
    foreach ($item in $sharedXml.SelectNodes("//*[local-name()='si']")) {
      $sharedStrings += (($item.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join "")
    }
  }

  $model = [ordered]@{
    formatVersion = 1
    sourceWorkbook = [IO.Path]::GetFileName($WorkbookPath)
    sharedFormulas = [ordered]@{}
    sheets = [ordered]@{}
  }

  foreach ($sheet in $workbook.workbook.sheets.sheet) {
    $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    $target = [string]$relationshipTargets[$relationshipId]
    $entryPath = if ($target.StartsWith("/")) { $target.TrimStart("/") } else { "xl/$target" }
    $sheetXml = Read-ZipXml $archive $entryPath
    $sheetModel = [ordered]@{}
    $sharedMasters = @{}

    foreach ($cell in $sheetXml.SelectNodes("//*[local-name()='c']")) {
      $formula = $null
      foreach ($child in $cell.ChildNodes) {
        if ($child.LocalName -eq "f") { $formula = $child; break }
      }
      if ($formula -and $formula.GetAttribute("t") -eq "shared" -and $formula.HasAttribute("ref")) {
        $master = @{
          address = $cell.GetAttribute("r")
          formula = $formula.InnerText
        }
        $sharedMasters[$formula.GetAttribute("si")] = $master
        $model.sharedFormulas["$($sheet.name)|$($formula.GetAttribute('si'))"] = $master
      }
    }

    foreach ($cell in $sheetXml.SelectNodes("//*[local-name()='c']")) {
      $address = $cell.GetAttribute("r")
      $formula = $null
      $valueNode = $null
      foreach ($child in $cell.ChildNodes) {
        if ($child.LocalName -eq "f") { $formula = $child }
        elseif ($child.LocalName -eq "v") { $valueNode = $child }
      }
      if ($formula) {
        $expression = $formula.InnerText
        if ($formula.GetAttribute("t") -eq "shared") {
          $sharedIndex = $formula.GetAttribute("si")
          if (-not $sharedMasters[$sharedIndex]) { throw "Shared formula master not found for $($sheet.name)!$address" }
          $group = "$($sheet.name)|$sharedIndex"
          $sheetModel[$address] = @{ g = $group }
          continue
        }
        $sheetModel[$address] = @{ f = $expression }
        continue
      }

      $cellType = $cell.GetAttribute("t")
      if ($cellType -eq "inlineStr") {
        $value = ($cell.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join ""
        $sheetModel[$address] = @{ v = $value }
      } elseif ($valueNode) {
        $rawValue = $valueNode.InnerText
        if ($cellType -eq "s") {
          $sheetModel[$address] = @{ v = $sharedStrings[[int]$rawValue] }
        } elseif ($cellType -eq "b") {
          $sheetModel[$address] = @{ v = ($rawValue -eq "1") }
        } elseif ($cellType -eq "str" -or $cellType -eq "e") {
          $sheetModel[$address] = @{ v = $rawValue }
        } else {
          $number = 0.0
          if ([double]::TryParse($rawValue, [Globalization.NumberStyles]::Float,
              [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
            $sheetModel[$address] = @{ v = $number }
          } else {
            $sheetModel[$address] = @{ v = $rawValue }
          }
        }
      }
    }
    $model.sheets[$sheet.name] = $sheetModel
  }

  $json = ConvertTo-Json -InputObject $model -Depth 20 -Compress
  $destination = [IO.Path]::GetFullPath($OutputPath)
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
  [IO.File]::WriteAllText($destination, $json, [Text.UTF8Encoding]::new($false))
  Write-Host "Built standalone model: $destination"
  Write-Host "Sheets: $($model.sheets.Count); cells: $(($model.sheets.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum)"
} finally {
  $archive.Dispose()
}
