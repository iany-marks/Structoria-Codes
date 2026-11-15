param([int]$Port = 5088)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$staticFiles = @{
  "/" = Join-Path $projectRoot "index.html"
  "/index.html" = Join-Path $projectRoot "index.html"
  "/styles.css" = Join-Path $projectRoot "styles.css"
  "/script.js" = Join-Path $projectRoot "script.js"
  "/column-engine.js" = Join-Path $projectRoot "column-engine.js"
}

function Send-Json {
  param($Context, [int]$Status, [object]$Value)
  $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 8 -Compress))
  $Context.Response.StatusCode = $Status
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Send-File {
  param($Context, [string]$Path)
  $type = switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png" { "image/png" }
    default { "application/octet-stream" }
  }
  $bytes = [IO.File]::ReadAllBytes($Path)
  $Context.Response.StatusCode = 200
  $Context.Response.ContentType = $type
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Get-Base64UrlBytes {
  param([string]$Text)
  if ($Text -notmatch "^[A-Za-z0-9_-]+$") {
    throw "Invalid base64url value."
  }
  $encoded = $Text.Replace("-", "+").Replace("_", "/")
  switch ($encoded.Length % 4) {
    1 { throw "Invalid base64url length." }
    2 { $encoded += "==" }
    3 { $encoded += "=" }
  }
  return [Convert]::FromBase64String($encoded)
}

function Test-PaidEntitlement {
  param([string]$Token)
  $secret = $env:STRUCTORIA_ENTITLEMENT_HMAC_SECRET
  if ([string]::IsNullOrWhiteSpace($secret) -or $secret.Length -lt 32 -or
      [string]::IsNullOrWhiteSpace($Token) -or $Token.Length -gt 8192) {
    return $false
  }

  $parts = $Token.Split(".")
  if ($parts.Length -ne 3) { return $false }
  try {
    $header = [Text.Encoding]::UTF8.GetString((Get-Base64UrlBytes $parts[0])) | ConvertFrom-Json
    $claims = [Text.Encoding]::UTF8.GetString((Get-Base64UrlBytes $parts[1])) | ConvertFrom-Json
    $signature = Get-Base64UrlBytes $parts[2]
  } catch {
    return $false
  }

  if ($header.alg -ne "HS256" -or $claims.iss -ne "structoria-billing" -or $claims.aud -ne "structoria-web") { return $false }
  if ($claims.plan -notin @("pro", "ultimate") -or [string]::IsNullOrWhiteSpace([string]$claims.sub)) { return $false }
  if (-not $claims.exp -or [double]$claims.exp -le [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) { return $false }
  $scopeList = if ($claims.scope -is [array]) { $claims.scope } else { ([string]$claims.scope).Split(" ") }
  if ($scopeList -notcontains "column-design:pdf") { return $false }

  $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
  try {
    $message = [Text.Encoding]::UTF8.GetBytes("$($parts[0]).$($parts[1])")
    $expected = $hmac.ComputeHash($message)
  } finally {
    $hmac.Dispose()
  }
  if ($signature.Length -ne $expected.Length) { return $false }

  $difference = 0
  for ($index = 0; $index -lt $expected.Length; $index++) {
    $difference = $difference -bor ($expected[$index] -bxor $signature[$index])
  }
  return $difference -eq 0
}

function Get-RequestEntitlement {
  param($Request)
  $header = $Request.Headers["Authorization"]
  if (-not $header -or -not $header.StartsWith("Bearer ", [StringComparison]::OrdinalIgnoreCase)) {
    return $false
  }
  return (Test-PaidEntitlement $header.Substring(7).Trim())
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Structoria column calculator: http://127.0.0.1:$Port/"
Write-Host "Calculations run in the standalone browser engine. Keep this window open."

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    } catch [System.Net.HttpListenerException] {
      break
    }

    $request = $context.Request
    if (-not [Net.IPAddress]::IsLoopback($request.RemoteEndPoint.Address)) {
      Send-Json $context 403 @{ error = "The calculator only accepts local requests." }
      continue
    }
    if ($request.Headers["Host"] -ne "127.0.0.1:$Port") {
      Send-Json $context 403 @{ error = "Open http://127.0.0.1:$Port/ to use the calculator." }
      continue
    }
    $origin = $request.Headers["Origin"]
    if ($origin -and $origin -ne "http://127.0.0.1:$Port") {
      Send-Json $context 403 @{ error = "Cross-origin requests are not accepted." }
      continue
    }

    $path = $request.Url.AbsolutePath
    if ($request.HttpMethod -eq "GET" -and $path -eq "/api/health") {
      Send-Json $context 200 @{ status = "ready"; calculationEngine = "Structoria standalone formula engine" }
    } elseif ($request.HttpMethod -eq "GET" -and $staticFiles.ContainsKey($path)) {
      Send-File $context $staticFiles[$path]
    } elseif ($request.HttpMethod -eq "GET" -and $path.StartsWith("/assets/")) {
      $assetName = [IO.Path]::GetFileName($path)
      $assetPath = Join-Path $projectRoot "assets\$assetName"
      if ((Test-Path -LiteralPath $assetPath -PathType Leaf) -and
          [IO.Path]::GetExtension($assetPath) -in @(".jpg", ".jpeg", ".png", ".json")) {
        Send-File $context $assetPath
      } else {
        Send-Json $context 404 @{ error = "Asset not found." }
      }
    } elseif ($request.HttpMethod -eq "POST" -and $path -eq "/api/column/pdf-access") {
      if ($request.ContentLength64 -gt 131072) {
        Send-Json $context 413 @{ error = "Request exceeds the allowed size." }
      } else {
        Send-Json $context 200 @{ pdfAvailable = (Get-RequestEntitlement $request) }
      }
    } else {
      Send-Json $context 404 @{ error = "Endpoint not found." }
    }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
