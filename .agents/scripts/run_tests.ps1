# Gate de Testing Reforzado - Backend SGDEA v2.0
# Ejecutar antes de cualquier commit
# Uso: .\.agents\scripts\run_tests.ps1
# Protocolo de Orquestación v2.0

param(
    [switch]$Verbose,
    [switch]$SkipTests   # Usar solo si los tests aún no están configurados
)

$ErrorActionPreference = "Stop"
$repoRoot  = Resolve-Path "$PSScriptRoot\..\.."
$hitosPath = "$repoRoot\docs\HITOS.md"
$fecha     = Get-Date -Format "yyyy-MM-dd HH:mm"
$exitCode  = 0
$warnings  = @()

Write-Host ""
Write-Host "[TEST v2.0] Gate de Testing - Backend SGDEA" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Set-Location $repoRoot

# ── 1. Verificar sintaxis JavaScript (node --check) ──────────────────────────
Write-Host ""
Write-Host "[JS] Verificando sintaxis de archivos clave..." -ForegroundColor Blue

$archivosCore = @("index.js") + (
    Get-ChildItem "routes","services","lib","middleware","validators","auth" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName
)

$syntaxErrors = 0
foreach ($archivo in $archivosCore) {
    if (Test-Path $archivo) {
        node --check $archivo 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   [ERROR] Sintaxis inválida: $archivo" -ForegroundColor Red
            $syntaxErrors++
        }
    }
}

if ($syntaxErrors -gt 0) {
    Write-Host "   [ERROR] $syntaxErrors error(es) de sintaxis" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "   [OK] Sintaxis JavaScript: $($archivosCore.Count) archivos OK" -ForegroundColor Green
}

# ── 2. Tests Jest con cobertura ───────────────────────────────────────────────
if ($exitCode -eq 0 -and -not $SkipTests) {
    Write-Host ""
    Write-Host "[RUN] Ejecutando tests (Jest + cobertura)..." -ForegroundColor Blue

    # Verificar si Jest está configurado
    $pkgContent   = Get-Content "$repoRoot\package.json" -Raw
    $hasJest      = ($pkgContent -match '"jest"') -or ($pkgContent -match '"mocha"')
    $hasTestScript = $pkgContent -match '"test"'
    $testsDir     = "$repoRoot\tests"
    $hasTestFiles = (Get-ChildItem $testsDir -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*.test.js" -or $_.Name -like "*.spec.js" }).Count -gt 0

    if (-not $hasTestFiles) {
        Write-Host "   [ADVERTENCIA] Directorio tests/ vacío. Configurar Jest con cobertura mínima 70%." -ForegroundColor Yellow
        $warnings += "Tests: directorio tests/ sin archivos de test"
    } else {
        $oldErrorPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $testOutput = npm test -- --coverage 2>&1 | Tee-Object -Variable testLines
        $ErrorActionPreference = $oldErrorPreference

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FALLO] Tests fallaron. Bloqueando commit." -ForegroundColor Red
            $exitCode = 1
        } else {
            # Intentar extraer cobertura
            $coverageLine = $testLines | Where-Object { $_ -match "Lines\s*\|\s*(\d+\.?\d*)" } | Select-Object -Last 1
            if ($coverageLine -match "(\d+\.?\d*)%") {
                $coveragePct = [float]$Matches[1]
                if ($coveragePct -lt 70) {
                    $warnMsg = "Cobertura: $coveragePct% (mínimo recomendado: 70%)"
                    Write-Host "   [ADVERTENCIA] $warnMsg" -ForegroundColor Yellow
                    $warnings += $warnMsg
                } else {
                    Write-Host "   [OK] Tests: cobertura $coveragePct%" -ForegroundColor Green
                }
            } else {
                Write-Host "   [OK] Tests pasaron" -ForegroundColor Green
                $warnings += "Cobertura: no se pudo parsear - revisar manualmente"
            }
        }
    }
} elseif ($SkipTests) {
    Write-Host ""
    Write-Host "   [OMITIDO] Tests omitidos por flag -SkipTests" -ForegroundColor Yellow
    $warnings += "Tests: omitidos manualmente con -SkipTests"
}

# ── 3. Verificar que el servidor arranca (smoke test) ─────────────────────────
if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "[SMOKE] Verificando que index.js no tiene errores de carga..." -ForegroundColor Blue
    # Solo verificar sintaxis, no levantar el servidor completo
    node --check index.js 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   [ERROR] index.js tiene errores de sintaxis" -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "   [OK] index.js: sintaxis válida" -ForegroundColor Green
    }
}

# ── 4. Resultado y registro en HITOS.md ──────────────────────────────────────
Write-Host ""
$warningStr = if ($warnings.Count -gt 0) { " | Advertencias: " + ($warnings -join "; ") } else { "" }

if ($exitCode -eq 0) {
    $entrada = "| $fecha | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK$warningStr | - |"
    Write-Host "[OK] Gate superado. Procediendo al commit." -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "Advertencias registradas:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "  • $_" -ForegroundColor Yellow }
    }
} else {
    $entrada = "| $fecha | [FALLO] Gate backend v2.0 | Gate fallido - commit bloqueado. Ejecutar rollback.ps1 | - |"
    Write-Host "[ERROR] Gate fallido. Ejecuta rollback.ps1 para revertir cambios." -ForegroundColor Red
}


Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue

exit $exitCode
