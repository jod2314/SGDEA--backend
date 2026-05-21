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

# -- 1. Verificar si hay script de test real ---------------------
$pkg = Get-Content "package.json" | ConvertFrom-Json
$testScript = $pkg.scripts.test

if (-not $testScript -or $testScript -like "echo*") {
    Write-Host ""
    Write-Host "[ADVERTENCIA] No hay tests configurados en package.json" -ForegroundColor Yellow
    Write-Host "   Instala Jest + Supertest y configura el script 'test' para activar el gate." -ForegroundColor Yellow
    Write-Host "   El commit procedera SIN validacion de tests." -ForegroundColor Yellow

    $entrada = "| $fecha | ADVERTENCIA Gate de testing | Sin tests configurados - commit permitido con advertencia | - |"
    Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "[OK] Gate superado (modo permisivo - sin tests)" -ForegroundColor Green
    exit 0
}

# -- 2. Verificar sintaxis JavaScript (smoke test) ----------------
Write-Host ""
Write-Host "[JS] Verificando sintaxis JavaScript..." -ForegroundColor Blue
$jsFiles = Get-ChildItem -Path $repoRoot -Include "*.js" -Recurse |
           Where-Object { $_.FullName -notmatch "node_modules" } |
           Select-Object -First 20

$syntaxErrors = 0
foreach ($file in $jsFiles) {
    node --check $file.FullName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   [ERROR] Error de sintaxis: $($file.Name)" -ForegroundColor Red
        $syntaxErrors++
    }
}

if ($syntaxErrors -gt 0) {
    Write-Host "   [ERROR] $syntaxErrors archivo(s) con errores de sintaxis" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "   [OK] Sintaxis JavaScript OK" -ForegroundColor Green
}

# -- 3. Ejecutar tests -----------------------------------------
if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "[RUN] Ejecutando tests..." -ForegroundColor Blue
    npm test 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FALLO] Tests fallaron. Bloqueando commit." -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "   [OK] Tests OK" -ForegroundColor Green
    }
}

# -- 4. Registrar resultado en HITOS.md -----------------------
if ($exitCode -eq 0) {
    $entrada = "| $fecha | [OK] Gate de testing | Tests pasaron - commit autorizado | - |"
    Write-Host ""
    Write-Host "[OK] Gate superado. Procediendo al commit." -ForegroundColor Green
} else {
    $entrada = "| $fecha | [FALLO] Gate de testing | Tests fallaron - commit bloqueado | - |"
    Write-Host ""
    Write-Host "[ERROR] Gate fallido. Ejecuta rollback.ps1 para revertir cambios." -ForegroundColor Red
}

Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue

exit $exitCode
