# Rollback Automatico - Backend SGDEA
# Revierte los cambios no comprometidos al ultimo commit estable
# Uso: .\.agents\scripts\rollback.ps1

param(
    [string]$Mensaje = "rollback-automatico-$(Get-Date -Format 'yyyyMMdd-HHmm')"
)

$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$hitosPath = "$repoRoot\docs\HITOS.md"
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm"

Set-Location $repoRoot

Write-Host ""
Write-Host "[ROLLBACK] Iniciando rollback - Backend SGDEA" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# Verificar si hay cambios que revertir
$status = git status --porcelain
if (-not $status) {
    Write-Host "[INFO] No hay cambios pendientes. El repositorio esta limpio." -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "[STASH] Guardando cambios en stash: $Mensaje" -ForegroundColor Yellow
git stash push -m $Mensaje

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Rollback completado." -ForegroundColor Green
    Write-Host "   Los cambios fueron guardados en el stash." -ForegroundColor Green
    Write-Host "   Para recuperarlos: git stash pop" -ForegroundColor Gray
    Write-Host "   Para descartarlos: git stash drop" -ForegroundColor Gray

    $entrada = "| $fecha | [ROLLBACK] Rollback | Cambios revertidos al ultimo commit estable - stash: $Mensaje | - |"
    Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue

    exit 0
} else {
    Write-Host ""
    Write-Host "[ERROR] Error durante el rollback. Revisa el estado de Git manualmente." -ForegroundColor Red
    exit 1
}
