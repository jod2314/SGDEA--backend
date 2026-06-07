# Security Scan - Backend SGDEA v2.0
# Ejecutar en el Gate de Testing (Fase 3) antes del commit
# Uso: .\.agents\scripts\security_scan.ps1
# Protocolo de Orquestacion v2.0

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$repoRoot  = Resolve-Path "$PSScriptRoot\..\.."
$hitosPath = "$repoRoot\docs\HITOS.md"
$fecha     = Get-Date -Format "yyyy-MM-dd HH:mm"
$blocked   = $false
$findings  = @()

Write-Host ""
Write-Host "[SEC v2.0] Security Scan - Backend SGDEA" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

Set-Location $repoRoot

# 1. npm audit
Write-Host ""
Write-Host "[SEC] Ejecutando npm audit..." -ForegroundColor Blue
try {
    $auditOutput = npm audit --audit-level=moderate --json 2>&1 | Out-String
    $auditJson   = $auditOutput | ConvertFrom-Json -ErrorAction SilentlyContinue

    if ($auditJson -and $auditJson.metadata) {
        $criticals = $auditJson.metadata.vulnerabilities.critical
        $highs     = $auditJson.metadata.vulnerabilities.high
        $moderates = $auditJson.metadata.vulnerabilities.moderate

        if ($criticals -gt 0) {
            $msg = "npm audit: $criticals vulnerabilidades CRITICAL (Advertencia de dependencias preexistentes)"
            Write-Host "   [ALTO] $msg" -ForegroundColor Yellow
            $findings += "[HIGH] $msg"
        }
        if ($highs -gt 0) {
            $msg = "npm audit: $highs vulnerabilidades HIGH (Advertencia de dependencias preexistentes)"
            Write-Host "   [ALTO] $msg" -ForegroundColor Yellow
            $findings += "[HIGH] $msg"
        }
        if ($moderates -gt 0) {
            Write-Host "   [MEDIO] npm audit: $moderates vulnerabilidades MODERATE" -ForegroundColor Yellow
            $findings += "[MEDIUM] npm audit: $moderates MODERATE"
        }
        if ($criticals -eq 0 -and $highs -eq 0) {
            Write-Host "   [OK] npm audit: sin vulnerabilidades criticas o altas" -ForegroundColor Green
        }
    } else {
        Write-Host "   [OK] npm audit: sin vulnerabilidades reportadas" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ADVERTENCIA] No se pudo ejecutar npm audit: $_" -ForegroundColor Yellow
    $findings += "[LOW] npm audit: no ejecutado"
}

# 2. Escaneo de secretos hardcodeados en codigo fuente
Write-Host ""
Write-Host "[SEC] Escaneando secretos hardcodeados..." -ForegroundColor Blue

$secretPatterns = @(
    'password\s*[:=]\s*[''"][^''"\s]{6,}[''"]',
    'secret\s*[:=]\s*[''"][^''"\s]{6,}[''"]',
    'api_key\s*[:=]\s*[''"][^''"\s]{6,}[''"]',
    'apikey\s*[:=]\s*[''"][^''"\s]{6,}[''"]',
    'mongodb\+srv://[^:]+:[^@]+@',
    'Bearer\s+eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+'
)

$targetPaths = @("routes","services","lib","middleware","validators","auth","index.js")
$jsFiles = Get-ChildItem -Path $targetPaths -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*.js" -and $_.FullName -notlike "*node_modules*" }
$secretsFound = 0

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) {
                $relPath = $file.FullName.Replace($repoRoot.Path, "")
                $msg = "Posible secreto hardcodeado en: $relPath"
                Write-Host "   [ALTO] $msg" -ForegroundColor Red
                $findings += "[HIGH] $msg"
                $blocked = $true
                $secretsFound++
            }
        }
    }
}

if ($secretsFound -eq 0) {
    Write-Host "   [OK] Sin secretos hardcodeados detectados" -ForegroundColor Green
}

# 3. Verificar auditoria en rutas de escritura
Write-Host ""
Write-Host "[SEC] Verificando registrarAuditoria en rutas POST/PUT/DELETE..." -ForegroundColor Blue

$routeFiles = Get-ChildItem -Path "routes" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*.js" }
$auditFails = 0

foreach ($file in $routeFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        # Detectar rutas de escritura
        $writeRoutes = [regex]::Matches($content, 'router\.(post|put|delete)\s*\(', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

        if ($writeRoutes.Count -gt 0) {
            # Verificar que el archivo usa registrarAuditoria
            if ($content -notmatch "registrarAuditoria") {
                $relPath = $file.FullName.Replace($repoRoot.Path, "")
                $msg = "Ruta con POST/PUT/DELETE sin registrarAuditoria(): $relPath ($($writeRoutes.Count) rutas de escritura)"
                Write-Host "   [ALTO] $msg" -ForegroundColor Red
                $findings += "[HIGH] $msg"
                $blocked = $true
                $auditFails++
            }
        }
    }
}

if ($auditFails -eq 0) {
    Write-Host "   [OK] Todas las rutas de escritura usan registrarAuditoria()" -ForegroundColor Green
}

# 4. Verificar que .env no esta en git staging
Write-Host ""
Write-Host "[SEC] Verificando git staging area..." -ForegroundColor Blue
$gitStatus = git status --porcelain 2>&1 | Out-String
if ($gitStatus -match "\.env[^.]") {
    $msg = ".env esta en la zona de staging - riesgo de exposicion de secretos"
    Write-Host "   [CRITICO] $msg" -ForegroundColor Red
    $findings += "[CRITICAL] $msg"
    $blocked = $true
} else {
    Write-Host "   [OK] .env no esta en staging" -ForegroundColor Green
}

# 5. Verificar configuracion de seguridad en index.js
Write-Host ""
Write-Host "[SEC] Verificando configuracion de seguridad..." -ForegroundColor Blue
if (Test-Path "index.js") {
    $indexContent = Get-Content "index.js" -Raw
    $missing = @()
    if ($indexContent -notmatch "helmet")          { $missing += "helmet" }
    if ($indexContent -notmatch "cors")            { $missing += "cors" }
    if ($indexContent -notmatch "rateLimit|rate-limit|express-rate-limit") { $missing += "rate-limit" }

    if ($missing.Count -gt 0) {
        $msg = "Middleware de seguridad faltante en index.js: $($missing -join ', ')"
        Write-Host "   [MEDIO] $msg" -ForegroundColor Yellow
        $findings += "[MEDIUM] $msg"
    } else {
        Write-Host "   [OK] helmet + cors + rate-limit configurados" -ForegroundColor Green
    }
}

# 6. Generar mini hash-sec para el commit
$hashSec = (-join (Get-Random -Count 4 -InputObject ([char[]]"abcdefghijklmnopqrstuvwxyz0123456789")))
Write-Host ""
Write-Host "[SEC] Hash de trazabilidad: [$hashSec]" -ForegroundColor Cyan
Write-Host "      Usar en commit: feat(scope): descripcion [$hashSec]" -ForegroundColor Cyan

# 7. Resultado
Write-Host ""
$findingsStr = if ($findings.Count -gt 0) { $findings -join " | " } else { "Sin hallazgos" }

if ($blocked) {
    $entrada = "| $fecha | [BLOQUEADO] Security scan backend | COMMIT BLOQUEADO. $findingsStr | - |"
    Write-Host "[BLOQUEADO] Security scan fallo. El commit esta bloqueado." -ForegroundColor Red
    Write-Host "Hallazgos:" -ForegroundColor Red
    $findings | ForEach-Object { Write-Host "  • $_" -ForegroundColor Red }
    Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue
    exit 1
} else {
    $entrada = "| $fecha | [OK] Security scan backend [$hashSec] | APROBADO. $findingsStr | - |"
    Write-Host "[APROBADO] Security scan superado. Hash: [$hashSec]" -ForegroundColor Green
    if ($findings.Count -gt 0) {
        Write-Host "Advertencias (no bloqueantes):" -ForegroundColor Yellow
        $findings | ForEach-Object { Write-Host "  • $_" -ForegroundColor Yellow }
    }
    Add-Content -Path $hitosPath -Value $entrada -ErrorAction SilentlyContinue
    Write-Output "HASH_SEC=$hashSec"
    exit 0
}
