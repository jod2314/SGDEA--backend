# 🏛️ Walkthrough — Backend SGDEA
## Robustecimiento del Asistente y Gobernanza

Este documento resume los cambios, esquemas, servicios y rutas de API implementadas en el backend en la sesión del 2026-06-07.

---

## ⚙️ Cambios e Infraestructura Backend

1. **Esquemas de Base de Datos Mongoose (`backend/schema/`)**:
   - `comiteArchivo.js`: Registro de miembros del comité y vigencia.
   - `actaComite.js`: Actas asociadas con índice compuesto único y anexo inmutable referenciado en `HistorialDocumento`.
   - `tablaValoracionDocumental.js`: Estructura TVD con índice compuesto único de versión y parcial único de aprobadas.
   - `matrizRiesgosDeposito.js`: ISO/TR 18128 con middleware pre-save para calcular nivel de riesgo.
   - `historialDocumento.js`: Se actualizó `plantillaId` para que sea opcional, facilitando actas inmutables generadas del sistema.

2. **Capa de Servicios (`backend/services/`)**:
   - `comiteService.js`: Generación de actas oficiales PDF/A firmadas con SHA-256 e integridad criptográfica.
   - `tvdService.js`: Aprobación atómica de TVD bajo transacciones nativas y sincronización mediante upserts con `SerieDocumental`.
   - `onboardingService.js`: Validación real en base de datos de fondos acumulados, actas de comités e instrumentos archivísticos aprobados para actualizar el progreso del checklist.

3. **Controladores y APIs Express (`backend/routes/`)**:
   - `/api/comites`: CRUD de comités y actas de comités, con endpoint de oficialización.
   - `/api/tvd`: CRUD y aprobación transaccional de TVD.
   - `/api/matriz-riesgos`: Registro de riesgos físicos/ambientales.
   - Registrados y protegidos con `authenticateToken` y `verifyEmpresaContext` en `index.js`, obligando a registrar auditoría forense (`registrarAuditoria`).
