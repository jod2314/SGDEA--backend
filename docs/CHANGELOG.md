# CHANGELOG — Backend SGDEA

Todos los cambios notables en este proyecto serán documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [1.4.0] — 2026-07-16

### Añadido
- **Integración de Jerarquías en Fondos Acumulados (Sprint 5):** Unificación del diagnóstico físico de acumulados con el organigrama corporativo y las Tablas de Valoración Documental (TVD).
- **Endpoint de Jerarquía Histórica:** Creación de `/api/intervencion-fondo/registrar-jerarquia` para crear dependencias oficiales en la base de datos a partir de la investigación en la Tarea 3.1 del asistente.
- **Relación de Dependencias en TVD y FUID:** Modificación de los esquemas `TablaValoracionDocumental` y `FondoAcumulado` para almacenar referencias de `Dependencia` en las series y en el inventario.
- **Formulario Interactivo del Organigrama:** Formulario interactivo en la Tarea 3.1 de `FondosAcumulados.tsx` para listar y registrar dependencias del organigrama histórico en caliente.
- **Selector de Dependencias en TVD:** Selector dinámico en `FormularioTVD.tsx` que permite asociar series documentales a dependencias específicas del sistema.

## [1.3.0] — 2026-07-16

### Añadido
- **Ecosistema SGD Polimórfico (Prototipo Fundacional):** Implementación de una arquitectura de datos extendida y polimórfica que permite definir nuevos tipos documentales dinámicamente.
- **Modelos y Validación Mongoose:** Esquemas `TipoDocumental` y `Documento` con metadatos extendidos implementados como mapas `Map` y validados en caliente con `Ajv` contra un JSON Schema en el backend.
- **Renderizado Dinámico de Formularios:** Componente React `FormularioDinamico` que lee el JSON Schema del tipo documental seleccionado y pinta de forma reactiva los campos específicos correspondientes (selects, números, fechas, textos) manejando validaciones y estados de error.
- **Panel de Control SGD Premium:** Vista dedicada en el frontend (`routes/Sgd.tsx`) para la radicación de documentos, consulta con filtros archivísticos avanzados, visualización de metadatos polimórficos expandibles, y configuración en caliente de nuevos tipos documentales (Test del Salto).
- **Ciclo Vital de Documentos:** Endpoints en el backend para la consulta de vigencia acumulada de retención de documentos individuales (`obtenerDocumentosListosDisposicion`) y procesamiento masivo de eliminación lógica bajo actas autorizadas.
- **Exportación FUID:** Endpoint y servicio para generar el Formato Único de Inventario Documental (FUID) reglamentario de documentos polimórficos.

## [1.2.0] — 2026-07-15

### Añadido
- **Bucle de Desarrollo Recursivo (Loop System):** Implementación de una espiral de refinamiento con reentrada al Pensador y un límite estricto de 4 iteraciones para evitar bucles de tokens infinitos ante fallos de validación.
- **Validador de Triple Capa (Loop Controller):** Verificación técnica (sintaxis, pruebas unitarias), semántica (fidelidad del requerimiento mediante el Grafo de Conocimiento) y de integración global.
- **Sistema Agent Forge (Auto-Creación):** Creación automática de perfiles de subagentes temporales mediante investigación web, clasificados en 4 macro-categorías (Pensador, Técnico, Científico y Creativo).
- **Asignación Contextual de Habilidades:** Distribución dinámica de skills atómicas exclusivas por rol (p. ej., `KnowledgeGraphQuery` y `SemanticValidator` asignadas bajo demanda al runtime del subagente).
- **Uso Segmentado del Grafo de Conocimiento:** Directrices que dividen las consultas al grafo en globales (para el Pensador y el Coordinador) e hiper-locales (para subagentes ejecutores).


### [1.1.0] — 2026-06-07

### Añadido
- Modelos Mongoose para gobernanza y archivo: `comiteArchivo.js` (miembros, vigencia), `actaComite.js` (anexo referenciado, índice compuesto único `{ empresaId, numeroActa }`), `tablaValoracionDocumental.js` (índice único compuesto `{ empresaId, version }` e índice parcial único de aprobadas), `matrizRiesgosDeposito.js` (cálculo dinámico en pre-save de probabilidad * impacto).
- Servicios de gobernanza y archivística: `comiteService.js` (oficialización de actas inmutables en PDF con sellos SHA-256) y `tvdService.js` (aprobación atómica en transacciones de TVDs y sincronización mediante upsert con `SerieDocumental`).
- Rutas Express multi-tenant y con auditoría forense (`registrarAuditoria`): `/api/comites`, `/api/tvd` y `/api/matriz-riesgos`.
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
