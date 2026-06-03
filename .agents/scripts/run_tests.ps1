# Gate de Testing - Backend SGDEA
# Ejecutar antes de cualquier commit
# Uso: .\.agents\scripts\run_tests.ps1

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$hitosPath = "$repoRoot\docs\HITOS.md"
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm"
$exitCode = 0

Write-Host ""
Write-Host "[TEST] Gate de Testing - Backend SGDEA" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

Set-Location $repoRoot

# -- 1. Verificar sintaxis JavaScript (smoke test rapido) ----------
Write-Host ""
Write-Host "[JS] Verificando sintaxis de archivos clave..." -ForegroundColor Blue
$archivosCore = @("index.js") + (Get-ChildItem "routes","services","lib" -Filter "*.js" -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { $_.FullName })
$syntaxErrors = 0
foreach ($archivo in $archivosCore) {
    if (Test-Path $archivo) {
        node --check $archivo 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   [ERROR] Sintaxis invalida: $archivo" -ForegroundColor Red
            $syntaxErrors++
        }
    }
}
if ($syntaxErrors -gt 0) {
    Write-Host "   [ERROR] $syntaxErrors error(es) de sintaxis encontrados" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "   [OK] Sintaxis JavaScript OK" -ForegroundColor Green
}

# -- 2. Ejecutar tests Jest ----------------------------------------
if ($exitCode -eq 0) {
    Write-Host ""
    $oldErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    npm test 2>&1 | Tee-Object -Variable testOutput
    $ErrorActionPreference = $oldErrorPreference
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FALLO] Tests fallaron. Bloqueando commit." -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "   [OK] Todos los tests pasaron" -ForegroundColor Green
    }
}

# -- 3. Registrar resultado en HITOS.md ----------------------------
if ($exitCode -eq 0) {
    $entrada = "| $fecha | [OK] Gate de testing | Sintaxis JS + Jest OK - commit autorizado | - |"
    Write-Host ""
    Write-Host "[OK] Gate superado. Procediendo al commit." -ForegroundColor Green
} else {
    $entrada = "| $fecha | [FALLO] Gate de testing | Gate fallido - commit bloqueado | - |"
    Write-Host ""
    Write-Host "[ERROR] Gate fallido. Ejecuta rollback.ps1 para revertir cambios." -ForegroundColor Red
}

Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue

exit $exitCode
