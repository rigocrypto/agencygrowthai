$ErrorActionPreference = 'Stop'

function Import-LocalEnv([string] $Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { continue }
    $name = $Matches[1]
    $value = $Matches[2]
    if ($value.Length -gt 1 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "Env:$name" -Value $value
  }
}

Import-LocalEnv '.env'
if (-not $env:NHOST_DATABASE_URL -or $env:NHOST_DATABASE_URL -notmatch '^postgres(ql)?://') {
  throw 'NHOST_DATABASE_URL_MISSING_OR_INVALID'
}

$drillRoot = Join-Path ([System.IO.Path]::GetTempPath()) 'agencygrowth-phase4-recovery'
$resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$resolvedRoot = [System.IO.Path]::GetFullPath($drillRoot)
if (-not $resolvedRoot.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'UNSAFE_RECOVERY_DIRECTORY'
}
New-Item -ItemType Directory -Path $resolvedRoot -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMddTHHmmssZ'
$archiveName = "agencygrowth-public-$stamp.dump"
$archivePath = Join-Path $resolvedRoot $archiveName
$containerName = "agencygrowth-phase4-restore-$([Guid]::NewGuid().ToString('N').Substring(0, 10))"
$restorePassword = "phase4-$([Guid]::NewGuid().ToString('N'))"
$started = Get-Date

try {
  docker run --rm --env NHOST_DATABASE_URL --env "BACKUP_FILE=$archiveName" --volume "${resolvedRoot}:/backup" postgres:14-alpine sh -c 'pg_dump --dbname="$NHOST_DATABASE_URL" --format=custom --schema=public --no-owner --no-acl --file="/backup/$BACKUP_FILE"' | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archivePath)) { throw 'PG_DUMP_FAILED' }

  $archive = Get-Item -LiteralPath $archivePath
  if ($archive.Length -le 0) { throw 'BACKUP_EMPTY' }
  $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash

  $list = docker run --rm --volume "${resolvedRoot}:/backup:ro" postgres:14-alpine pg_restore --list "/backup/$archiveName"
  if ($LASTEXITCODE -ne 0 -or $list -notmatch 'TABLE public agencies') { throw 'BACKUP_CATALOG_VALIDATION_FAILED' }

  docker run --detach --name $containerName --env "POSTGRES_PASSWORD=$restorePassword" --volume "${resolvedRoot}:/backup:ro" postgres:14-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'RESTORE_CONTAINER_START_FAILED' }

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $containerName pg_isready --username postgres --dbname postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'RESTORE_CONTAINER_NOT_READY' }

  docker exec --env "PGPASSWORD=$restorePassword" $containerName createdb --username postgres agencygrowth_restore
  if ($LASTEXITCODE -ne 0) { throw 'RESTORE_DATABASE_CREATE_FAILED' }
  docker exec --env "PGPASSWORD=$restorePassword" $containerName pg_restore --username postgres --dbname agencygrowth_restore --no-owner --no-acl "/backup/$archiveName"
  if ($LASTEXITCODE -ne 0) { throw 'PG_RESTORE_FAILED' }

  $validationSql = @"
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')::text,
  (SELECT count(*) FROM public.agencies)::text,
  (SELECT count(*) FROM public.agents)::text,
  ((SELECT count(*) FROM public.leads) +
   (SELECT count(*) FROM public.candidates) +
   (SELECT count(*) FROM public.appointments) +
   (SELECT count(*) FROM public.campaigns) +
   (SELECT count(*) FROM public.campaign_events) +
   (SELECT count(*) FROM public.lead_events) +
   (SELECT count(*) FROM public.candidate_events) +
   (SELECT count(*) FROM public.content_assets) +
   (SELECT count(*) FROM public.content_reviews) +
   (SELECT count(*) FROM public.ai_interactions) +
   (SELECT count(*) FROM public.consents) +
   (SELECT count(*) FROM public.audit_logs))::text;
"@
  $validation = docker exec --env "PGPASSWORD=$restorePassword" $containerName psql --username postgres --dbname agencygrowth_restore --tuples-only --no-align --command $validationSql
  if ($LASTEXITCODE -ne 0) { throw 'RESTORE_VALIDATION_QUERY_FAILED' }
  $values = ($validation.Trim() -split '\|')
  if ($values.Count -ne 4 -or $values[0] -ne '15' -or $values[1] -ne '2' -or $values[2] -ne '2' -or $values[3] -ne '0') {
    throw 'RESTORE_CONTENT_VALIDATION_FAILED'
  }

  $elapsed = [Math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  Write-Output 'MANUAL_BACKUP=VERIFIED'
  Write-Output 'BACKUP_SCOPE=PUBLIC_SCHEMA_LOGICAL'
  Write-Output "BACKUP_SIZE_BYTES=$($archive.Length)"
  Write-Output "BACKUP_SHA256=$hash"
  Write-Output 'BACKUP_CATALOG=VERIFIED'
  Write-Output 'ISOLATED_RESTORE=VERIFIED'
  Write-Output 'RESTORED_PUBLIC_TABLES=15'
  Write-Output 'RESTORED_AGENCIES=2'
  Write-Output 'RESTORED_AGENTS=2'
  Write-Output 'RESTORED_BUSINESS_ROWS=0'
  Write-Output "DRILL_DURATION_SECONDS=$elapsed"
  Write-Output "BACKUP_LOCATION=$archivePath"
  Write-Output 'LIVE_NHOST_CHANGES=NONE'
} finally {
  $existing = docker ps --all --quiet --filter "name=^${containerName}$"
  if ($existing) { docker rm --force $containerName | Out-Null }
}
