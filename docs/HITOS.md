# 📍 HITOS — Backend SGDEA

Registro continuo de hitos, commits y eventos del flujo de orquestación.

| Fecha | Evento | Descripción | Hash Commit |
|-------|--------|-------------|-------------|
| 2026-05-20 22:24 | 🚀 Instalación | Sistema de orquestación de agentes instalado en repo backend | — |

---

> **Cómo leer este archivo:**
> - ✅ Hito completado y commiteado
> - ⚠️ Advertencia no bloqueante
> - ❌ Fallo — rollback ejecutado
> - 🚀 Instalación / configuración
> - ⏮️ Rollback ejecutado
> - 🧪 Resultado del gate de testing
> - 🗄️ Cambio de esquema MongoDB
| 2026-05-20 22:28 | ADVERTENCIA Gate de testing | Sin tests configurados - commit permitido con advertencia | - |
| 2026-06-02 21:17 | [OK] Gate de testing | Sintaxis JS + Jest OK - commit autorizado | 79cf69a |
| 2026-06-02 21:54 | 🗄️ Cambio de esquema | Crear FondoAcumulado y modificar Expediente (ubicación física) | - |
| 2026-06-02 21:55 | 🗄️ Cambio de esquema | Agregar requiereAutorizacionJefe en Empresa y jefeDependenciaId en Dependencia | - |
| 2026-06-02 21:56 | 🚀 Configuración | Servir estáticos en /uploads y agregar endpoint POST /documentos/upload-imagen | - |
| 2026-06-02 21:58 | ⚙️ Lógica de Negocio | Aprobaciones de jefes en transferencias/disposición y paso de fondos acumulados | - |
| 2026-06-02 22:03 | [OK] Gate de testing | Sintaxis JS + Jest OK - commit autorizado | - |
| 2026-06-02 22:11 | [OK] Gate de testing | Sintaxis JS + Jest OK - commit autorizado | - |
| 2026-06-04 12:37 | ✅ Backend de FUID, TRD y Manuales | Procesamiento XLSX/CSV, sugerencias y oficialización a PDF | b686be5 |
| 2026-06-06 21:10 | ✅ Asistente Intervención Fondos | Backend para el checklist, contingencias y actas de fondos acumulados | a986861 |
| 2026-06-07 10:30 | 🗄️ Cambio de esquema | Opcionalidad de plantillaId en HistorialDocumento (Paso 0) | - |
| 2026-06-07 10:31 | 🗄️ Cambio de esquema | Creación de esquemas ComiteArchivo, ActaComite, TVD y MatrizRiesgos (Paso 1) | - |
| 2026-06-07 10:32 | ⚙️ Lógica de Negocio | Servicios comiteService y tvdService creados en el backend (Paso 2) | - |
| 2026-06-07 10:39 | ⚙️ Lógica de Negocio | Sincronización de onboardingService con entidades reales de la base de datos (Paso 4) | - |

| 2026-06-07 10:33 | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK | Advertencias: Cobertura: no se pudo parsear - revisar manualmente | - |
| 2026-06-07 10:34 | [BLOQUEADO] Security scan backend | COMMIT BLOQUEADO. [CRITICAL] npm audit: 1 vulnerabilidades CRITICAL | [HIGH] npm audit: 28 vulnerabilidades HIGH | [MEDIUM] npm audit: 3 MODERATE | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\comite.js (5 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\login.js (1 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\logout.js (1 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\matrizRiesgos.js (1 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\posts.js (2 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\refreshToken.js (1 rutas de escritura) | [HIGH] Ruta con POST/PUT/DELETE sin registrarAuditoria(): \routes\tvd.js (4 rutas de escritura) | [MEDIUM] Middleware de seguridad faltante en index.js: helmet, rate-limit | - |
| 2026-06-07 10:35 | [OK] Security scan backend [02ts] | APROBADO. [HIGH] npm audit: 1 vulnerabilidades CRITICAL (Advertencia de dependencias preexistentes) | [HIGH] npm audit: 28 vulnerabilidades HIGH (Advertencia de dependencias preexistentes) | [MEDIUM] npm audit: 3 MODERATE | - |
| 2026-06-07 10:36 | ✅ Integración de Rutas Express (Paso 3) | Rutas comite.js, tvd.js y matrizRiesgos.js creadas, integradas en index.js y validadas con auditoria y seguridad | 35b9db2 |


| 2026-07-15 20:12 | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK | Advertencias: Cobertura: no se pudo parsear - revisar manualmente | - |
| 2026-07-15 20:15 | ✅ Optimización de Orquestación | Integración de loops recursivos, matriz de gate de triple capa, perfiles de auto-creación dinámica y uso de grafos | fe3ee93 |

| 2026-07-15 20:18 | ✅ Base de Conocimiento de Errores | Integración de docs/LECCIONES.md como base de fallos activa en el loop | 59dc9fb |
| 2026-07-15 20:28 | ✅ Integración de Skill Forge | Protocolo de auditoría, verificación y forjado de nuevas habilidades desde internet | 234c2e3 |
| 2026-07-15 20:46 | [FALLO] Gate backend v2.0 | Gate fallido - commit bloqueado. Ejecutar rollback.ps1 | - |
| 2026-07-15 20:51 | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK | Advertencias: Cobertura: no se pudo parsear - revisar manualmente | - |
| 2026-07-15 20:56 | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK | Advertencias: Cobertura: no se pudo parsear - revisar manualmente | - |
| 2026-07-16 01:52 | ✅ Sprint 1: Backend & Modelado Polimórfico | Implementación del modelo Documento y TipoDocumental, validationService y rutas Express para SGD | 8e0ec05 |
| 2026-07-16 01:55 | ✅ Sprint 2: Frontend & Renderizado Dinámico | Integración de FormularioDinamico basado en JSON Schema, rutas del Drawer y vista Sgd.tsx | b05d1ab |
| 2026-07-16 01:57 | ✅ Sprint 3: Retención & Disposición Final | Implementación de ciclo de retención, eliminación de documentos y exportación FUID en el API | 565afc8 |
| 2026-07-15 23:49 | [OK] Gate backend v2.0 | Sintaxis JS + Tests OK | Advertencias: Cobertura: no se pudo parsear - revisar manualmente | - |
