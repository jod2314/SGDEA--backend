# Reglas del Orquestador — Backend SGDEA
## Protocolo de Orquestación v2.0

---

## 🎭 Scopes por agente

Cada agente solo puede modificar los archivos dentro de su scope. Si necesita tocar algo fuera, emite `HANDOFF_REQUEST` al orquestador.

```
backend/
├── routes/               ✅ backend-dev, code-review-backend (lectura)
├── services/             ✅ backend-dev
├── middleware/           ✅ backend-dev
├── schema/               ✅ backend-dev
├── lib/                  ✅ backend-dev
├── validators/           ✅ backend-dev
├── auth/                 ✅ backend-dev
├── scripts/              ✅ backend-dev
├── tests/                ✅ qa-agent, backend-dev
├── index.js              ⚠️  SOLO con aprobación explícita del usuario
├── package.json          ✅ backend-dev (deps), security-agent (lectura)
├── .env.example          ✅ backend-dev, security-agent
└── docs/                 ✅ orquestador, todos los agentes (escritura en HITOS.md, LECCIONES.md, REDUNDANCIAS.md)
```

### Scopes de agentes de revisión (solo lectura)
```
security-agent   → package.json, .env.example, routes/*, index.js (solo lectura)
code-review-backend → routes/, services/, schema/ (solo lectura)
architect        → PROXIMA_TAREA.md, docs/architecture/*
product-owner    → PROXIMA_TAREA.md, docs/ (lectura)
```

### Archivos PROHIBIDOS para subagentes
```
├── .env                  ❌ NUNCA (secretos reales)
├── .git/                 ❌ NUNCA
├── node_modules/         ❌ NUNCA
├── .agents/              ❌ NUNCA desde un subagente
└── banter_text_dump.txt  ❌ Datos fuente — no modificar
```

## 🔌 Acceso Total al Grafo MCP para Subagentes

**REGLA INVENTARIABLE:** Al definir o invocar cualquier subagente en este repositorio, el Orquestador DEBE incluir obligatoriamente:
- `enable_mcp_tools: true`

Esto equipa a todos los subagentes (`architect`, `backend-dev`, `security-agent`, `qa-agent`, `code-review-backend`, `product-owner`) con acceso completo al servidor MCP `code-review-graph` (`semantic_search_nodes`, `query_graph`, `get_review_context`, `detect_changes`, `get_impact_radius`, etc.).

---

## 📋 Convenciones CRÍTICAS (SGDEA)

1. **Auditoría obligatoria:** Todo `POST`, `PUT`, `DELETE` DEBE invocar:
   ```javascript
   await registrarAuditoria({ empresaId, usuarioId: req.user.id, accion: 'NOMBRE_ACCION', detalles: {...}, req })
   ```
2. **Contexto de empresa:** Rutas operativas DEBEN usar `verifyEmpresaContext`:
   ```javascript
   router.use(verifyToken, verifyEmpresaContext)
   const empresaId = req.empresaContext.id
   ```
3. **Servicios:** Nunca lógica pesada en rutas — siempre en `services/`
4. **Respuestas:** `return jsonResponse(res, statusCode, body)` — siempre
5. **Validación:** Esquemas Zod en `validators/` antes del controller
6. **Multi-tenant:** Todo query MongoDB filtra por `empresaId`
7. **Comentarios:** En español

---

## 📋 Protocolo de Handoff (OBLIGATORIO)

Cuando el Paso N termina y el Paso N+1 es de otro agente (ej: backend-dev → frontend-dev):

1. El agente del Paso N entrega `HANDOFF_NOTES` (ver formato en `AGENT_CATALOG.md`)
2. El orquestador inyecta las `HANDOFF_NOTES` en el contexto del siguiente agente
3. El siguiente agente DEBE leer las notas antes de empezar (incluye contratos de API)

**El orquestador nunca continúa sin HANDOFF_NOTES cuando el siguiente paso depende del actual.**

---

## 📋 Protocolo Anti-Redundancias (OBLIGATORIO)

Antes de crear cualquier archivo nuevo:
1. ¿Existe ya un endpoint similar en `routes/`?
2. ¿Puedo extender un service existente?
3. ¿Este helper ya existe en `lib/`?
4. ¿Esta dependencia es necesaria o puedo usar Node.js nativo?
5. ¿Este schema ya tiene estos campos?

Si la respuesta es "sí", justificar por qué se crea de todas formas.

---

## 📋 Matriz del Gate de Testing (Fase 3)

| Tests | Lint | Security | Resultado |
|:-----:|:----:|:--------:|:----------|
| ✅ | ✅ | ✅ | **COMMIT** |
| ⚠️ (50-70% cobertura) | ✅ | ✅ | **COMMIT** + warning en HITOS.md |
| ✅ | ❌ | ✅ | **PAUSA** — fix lint |
| ❌ | - | - | **ROLLBACK** + notificar |
| - | - | ❌ (critical/high) | **ROLLBACK** + notificar |

---

## 📋 Formato de Commit

```
tipo(scope): descripción concisa [hash-sec]
```

### Tipos de Commit Permitidos

| Tipo | Uso |
|:-----|:----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactorización sin cambio funcional |
| `security` | Parche de seguridad |
| `docs` | Documentación |
| `test` | Tests |
| `chore` | Mantenimiento (deps, config) |
| `schema` | Cambio de esquema de base de datos |

---

## 📋 Criterios de Aceptación General (Validador de Triple Capa)

Un paso o hito se considera completamente aprobado y listo para commit únicamente tras superar el **Validador de Triple Capa (Loop Controller)**:
1.  **Capa Técnica:**
    *   El servidor arranca sin errores de sintaxis (`node index.js`).
    *   Los endpoints responden correctamente en pruebas de integración.
    *   La auditoría obligatoria se registra correctamente en MongoDB.
    *   El Security Agent aprueba el diff (sin secretos ni vulnerabilidades OWASP).
2.  **Capa Semántica (KnowledgeGraph):**
    *   Se verifica que las modificaciones no colisionen con los flujos lógicos existentes mediante `KnowledgeGraphQuery`.
    *   Se comprueba la coherencia de la lógica y los comentarios en español respecto al blueprint del Pensador.
3.  **Capa de Integración:**
    *   La lógica y los schemas modificados por subagentes especialistas encajan perfectamente con las rutas y servicios existentes.

---

## 🔁 El Bucle de Desarrollo Recursivo (Loop System)

Cuando se ejecutan tareas complejas de backend, se activa la espiral de desarrollo recursivo:
1.  **El Pensador (Thinker):** Define el blueprint técnico de servicios/schemas, criterios de aceptación y realiza el mapeo de dependencias mediante `KnowledgeGraphQuery`.
2.  **El Coordinador (Coordinator):** Distribuye subtareas y auto-crea agentes si el perfil no existe, inyectando las skills necesarias bajo demanda.
3.  **El Validador (Loop Controller):** Evalúa el Gate de Triple Capa.
    *   **Si pasa:** Transmite el éxito al Pensador para que realice el Acta de Cierre, realice el commit/push y finalice el bucle.
    *   **Si falla (Iteración < 4):** Genera un `diagnostico_fallo.txt` detallado y reinicia el bucle inyectando el diagnóstico como contexto directo al Pensador.
    *   **Si falla (Iteración >= 4):** Detiene el bucle (PAUSA), resguarda los cambios en una rama temporal `fix/failed-attempt` y notifica al usuario con un resumen de los bloqueos.

## 🛠️ Fortalecimiento, Auditoría y Asignación de Skills

Las skills se gestionan, auditan y expanden de forma activa para dotar a los agentes de capacidades precisas sin desperdicio de contexto:

### A. Auditoría de Skills al inicio del Loop (Fase 1 - Diseño)
1.  **Análisis de Requisitos:** Una vez generado el blueprint técnico de la tarea (schemas, routes, services), el Coordinador realiza una auditoría obligatoria de las habilidades requeridas.
2.  **Verificación de Suficiencia:** Compara las habilidades exigidas con las skills locales en `.agents/skills/` y las del sistema de AntiGravity.
3.  **Mapeo y Asignación:** Si las skills existentes cubren los requerimientos, las inyecta como herramientas (Function Calling) en el runtime del agente según su rol.

### B. Forjado de Skills Dinámicas (Skill Forge)
Si la auditoría determina que las skills existentes **no son suficientes** para el hito:
1.  **Investigación Web:** El Coordinador activa un subagente de investigación que busca en repositorios de GitHub, APIs, o documentación de NPM/Node.js de código abierto la lógica necesaria.
2.  **Implementación Local:** Crea un subdirectorio en `.agents/skills/[nombre-skill]/` e implementa el script con un archivo `SKILL.md` estructurado que detalle:
    *   `Input/Output` (Esquema JSON estricto).
    *   `Scope de Archivos` (Frontera de seguridad en Mongoose, Express, etc.).
3.  **Validación de la Skill:** Antes de su uso, el Validador Técnico comprueba que la skill corra sin errores en el entorno local sandbox.

### C. Matriz de Asignación por Rol
*   **🧠 Pensador:** `KnowledgeGraphQuery` (Relaciones globales), `SemanticValidator`.
*   **🛠️ Técnico:** `KnowledgeGraphQuery` (Foco local), `RefactoringEngine`, `CodeReviewHelper`, más las skills técnicas forjadas específicas de la tarea.
*   **🧪 Científico:** `MathCalculationEngine`, `DataStructureAnalyzer`, más algoritmos o scripts científicos forjados (ej. optimizadores de consultas, hashing).
*   **🎨 Creativo:** `AuditorLogger`, `ReportTemplateGenerator`, más recursos visuales de PDF/XML.

---


## 🧠 Base de Conocimiento Activa de Errores (docs/LECCIONES.md)

Para prevenir la repetición de fallas históricas y acelerar la resolución de problemas conocidos, el sistema utiliza `docs/LECCIONES.md` como una **Base de Conocimientos Activa**:
1.  **Consulta Preventiva (Fase 1 - Diseño):** Al recibir la tarea, el Pensador escanea `docs/LECCIONES.md` para identificar lecciones aprendidas anteriores vinculadas a los archivos, controladores, servicios o bases de datos que se van a modificar.
2.  **Inyección de Restricciones (Fase 2 - Ejecución):** Si se detecta una lección histórica relevante, el Coordinador debe inyectar una regla de prevención en el prompt de sistema del subagente especialista (ej. *"REGLA PREVENTIVA HISTÓRICA: Validar que toda escritura invoque registrarAuditoria() pasando req según lección del 2026-06-07"*).
3.  **Resolución de Errores Automatizada (Fase 3 - Validación):** Si el Validador de Triple Capa reporta un fallo, contrastará el error técnico con la base de lecciones. Si hay coincidencia, el `diagnostico_fallo.txt` adjuntará la solución preestablecida para resolverlo inmediatamente.
4.  **Registro Obligatorio (Fase 4 - Cierre):** Todo fallo superado en el bucle que no estuviera previamente registrado debe documentarse en `docs/LECCIONES.md` siguiendo el formato estándar antes de proceder al commit final.

---

## 📋 Memoria del Orquestador (6 capas)

| Capa | Archivo | Cuándo se carga |
|:-----|:--------|:----------------|
| Inmediata | `PROXIMA_TAREA.md` | Cada tarea activa |
| De Estado | `loop_state.json` | Persistencia del loop activo (intentos, diagnósticos, rama) |
| Episódica | `docs/HITOS.md` | Al revisar progreso |
| Lecciones | `docs/LECCIONES.md` | Base de conocimientos activa de errores y aprendizaje |
| Redundancias | `docs/REDUNDANCIAS.md` | Al detectar duplicaciones |
| Permanente | `GEMINI.md` (raíz `C:\web`) | Siempre activa (ligera) |


