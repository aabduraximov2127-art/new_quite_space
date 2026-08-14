$ErrorActionPreference = "Stop"
$token = $env:RENDER_API_KEY
if (-not $token) { throw "RENDER_API_KEY is required" }

$headers = @{
  Authorization = "Bearer $token"
  Accept = "application/json"
  "Content-Type" = "application/json"
}

$ownerId = "tea-d9sph9qjobas73fqo6o0"
$repo = "https://github.com/aabduraximov2127-art/new_quite_space"
$branch = "main"

function Invoke-Render {
  param([string]$Method, [string]$Url, [object]$Body = $null)
  if ($Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

Write-Host "Creating Postgres..."
$db = Invoke-Render POST "https://api.render.com/v1/postgres" @{
  ownerId = $ownerId
  name = "quietspace-db"
  plan = "free"
  version = "16"
  databaseName = "quietspace"
  databaseUser = "quietspace"
  region = "frankfurt"
}
$dbId = $db.id
Write-Host "Postgres ID: $dbId"

Write-Host "Waiting for Postgres..."
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 10
  $status = (Invoke-Render GET "https://api.render.com/v1/postgres/$dbId").status
  Write-Host "  status: $status"
  if ($status -eq "available") { break }
}

$conn = Invoke-Render GET "https://api.render.com/v1/postgres/$dbId/connection"
$databaseUrl = $conn.connectionString
Write-Host "Database ready."

Write-Host "Creating backend web service..."
$api = Invoke-Render POST "https://api.render.com/v1/services" @{
  type = "web_service"
  name = "quietspace-api"
  ownerId = $ownerId
  repo = $repo
  branch = $branch
  rootDir = "backend"
  serviceDetails = @{
    runtime = "python"
    plan = "free"
    region = "frankfurt"
    healthCheckPath = "/api/health/"
    envSpecificDetails = @{
      buildCommand = "pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate && python manage.py seed_places"
      startCommand = "gunicorn config.wsgi:application --bind 0.0.0.0:`$PORT"
    }
  }
  envVars = @(
    @{ key = "PYTHON_VERSION"; value = "3.11.9" },
    @{ key = "DEBUG"; value = "False" },
    @{ key = "ALLOWED_HOSTS"; value = ".onrender.com" },
    @{ key = "DATABASE_URL"; value = $databaseUrl },
    @{ key = "CORS_ALLOWED_ORIGINS"; value = "https://quietspace-frontend.onrender.com" },
    @{ key = "AI_MODEL"; value = "gemini-flash-latest" }
  )
}
$apiId = $api.service.id
Write-Host "API service ID: $apiId"
Write-Host "API URL: $($api.service.serviceDetails.url)"

Write-Host "Creating frontend static site..."
$fe = Invoke-Render POST "https://api.render.com/v1/services" @{
  type = "static_site"
  name = "quietspace-frontend"
  ownerId = $ownerId
  repo = $repo
  branch = $branch
  serviceDetails = @{
    buildCommand = "node scripts/write-config.js"
    publishPath = "frontend"
  }
  envVars = @(
    @{ key = "API_HOST"; value = $api.service.serviceDetails.url }
  )
}
$feId = $fe.service.id
Write-Host "Frontend service ID: $feId"
Write-Host "Frontend URL: $($fe.service.serviceDetails.url)"

Write-Host "Triggering deploys..."
Invoke-Render POST "https://api.render.com/v1/services/$apiId/deploys" @{ clearCache = "do_not_clear" } | Out-Null
Invoke-Render POST "https://api.render.com/v1/services/$feId/deploys" @{ clearCache = "do_not_clear" } | Out-Null

Write-Host "Done."
Write-Host "Frontend: $($fe.service.serviceDetails.url)"
Write-Host "Backend: $($api.service.serviceDetails.url)"
