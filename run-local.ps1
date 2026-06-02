$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = 'C:\Users\parvi\Documents\New project\tools\node-v20.20.1-win-x64'
$nodeExe = Join-Path $nodeDir 'node.exe'
$npmCmd = Join-Path $nodeDir 'npm.cmd'

if (-not (Test-Path $nodeExe)) {
  Write-Error "Node.js not found at $nodeExe"
  exit 1
}

Set-Location $projectDir

if (-not (Test-Path (Join-Path $projectDir 'node_modules'))) {
  & $npmCmd install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:NODE_ENV = 'production'
& $npmCmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $nodeExe dist/index.js
