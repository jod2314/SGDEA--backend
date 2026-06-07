# CHANGELOG — Backend SGDEA

Todos los cambios notables en este proyecto serán documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido
- Endpoints y servicios de control de intervención de fondos acumulados (/api/intervencion-fondo), administrando el estado del checklist, contingencias registradas y generación inmutable de actas en formato PDF/A.
- Nuevo esquema `FondoAcumulado` para documentar inventarios históricos de fondos acumulados preexistentes.
- Procesamiento masivo de fondos acumulados (FUID) dual XLSX/CSV en `routes/fondosAcumulados.js` y `services/fondosAcumuladosService.js` con validación y reporte de errores por fila.
- Endpoint de recomendación inteligente de series TRD/TVD según sector en `routes/archivistica.js` mapeando BANTER.
- Endpoints de generación dinámica y oficialización de manuales en `routes/onboarding.js` y `services/onboardingService.js` con conversión a PDF/A inmutable.
- Campo `ubicacionFisica` (seccion, bloque, estante, peldano, caja, carpeta) en el esquema `Expediente` para control físico.
- Campo `jefeDependenciaId` en el esquema `Dependencia` para la delegación de autorizaciones.
- Ruta `POST /upload-imagen` con multer para la carga local de imágenes del editor en `./uploads`.
- Endpoint `PUT /expedientes/:id/ubicacion` para actualizar la estantería física del expediente en el archivo.
- Nueva ruta `/api/fondos-acumulados` con soporte para listado, registro, eliminación y exportación en formato FUID CSV.
- Endpoint seguro `/api/empresas/:id/usuarios` para la asignación de jefes.
- Sistema de orquestación de agentes (`.agents/`)
  - `stack.config.md` — configuración del stack tecnológico
  - `AGENT_CATALOG.md` — catálogo dinámico de agentes especialistas
  - `orchestrator_rules.md` — reglas de scope y convenciones SGDEA
  - `scripts/run_tests.ps1` — gate de testing (con smoke test de sintaxis JS)
  - `scripts/rollback.ps1` — protocolo de rollback automático
  - `docs/HITOS.md` — registro continuo de hitos
  - `docs/CHANGELOG.md` — este archivo
- `.env.example` — plantilla de variables de entorno sin valores sensibles

### Modificado
- Rutas de transferencias y disposición final para requerir autorización del jefe de dependencia si `requiereAutorizacionJefe` está habilitado.
- Transiciones del asistente de onboarding para incorporar el paso 5 (Gestión de Fondos Acumulados).

---

## Formato de Entradas Futuras

```
## [versión] — YYYY-MM-DD

### Añadido
- Nueva ruta/servicio X

### Modificado
- Cambio en esquema Mongoose Y

### Corregido
- Bug en middleware Z

### Seguridad
- Parche OWASP W
```
