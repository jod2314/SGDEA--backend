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

## 📋 Criterios de Aceptación General

Un paso se considera completado cuando:
- El servidor arranca sin errores (`node index.js`)
- Los endpoints responden correctamente
- La auditoría se registra correctamente en MongoDB
- El Security Agent aprobó el diff
- Los cambios están en `docs/HITOS.md`

---

## 📋 Memoria del Orquestador (5 capas)

| Capa | Archivo | Cuándo se carga |
|:-----|:--------|:----------------|
| Inmediata | `PROXIMA_TAREA.md` | Cada tarea activa |
| Episódica | `docs/HITOS.md` | Al revisar progreso |
| Lecciones | `docs/LECCIONES.md` | Cuando algo falla o se descubre un patrón |
| Redundancias | `docs/REDUNDANCIAS.md` | Al detectar duplicaciones |
| Permanente | `GEMINI.md` (raíz `C:\web`) | Siempre activa (ligera) |
