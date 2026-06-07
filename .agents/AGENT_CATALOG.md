# 📋 Catálogo de Agentes — Backend SGDEA
## Protocolo de Orquestación v2.0

Registro del **equipo permanente de 7 agentes** del repo backend.

> **Regla de oro:** Ningún agente toca archivos fuera de su scope sin autorización explícita del orquestador.  
> Si un agente necesita hacerlo, emite un `HANDOFF_REQUEST` al orquestador detallando qué archivo y por qué.

---

## 🎭 Equipo Permanente

| Rol | Nombre | Especialidad | Scope de archivos | Prompt base | Estado |
|:---:|:-------|:-------------|:------------------|:------------|:------:|
| 🏛️ Arquitecto | `architect` | Diseño, contratos API, modelo datos, flujo | `docs/architecture/*`, `PROXIMA_TAREA.md` | `.agents/prompts/architect.md` | ✅ Activo |
| ⚙️ Backend Dev | `backend-dev` | Routes, controllers, services, models | `routes/*`, `services/*`, `schema/*`, `middleware/*`, `lib/*`, `validators/*`, `auth/*` | `.agents/prompts/backend-dev.md` | ✅ Activo |
| 🔒 Seguridad | `security-agent` | Deps scan, secret scan, OWASP, auth | `package.json`, `.env.example`, `routes/*` (lectura), `index.js` (lectura) | `.agents/prompts/security-agent.md` | ✅ Activo |
| 🧪 QA | `qa-agent` | Tests unitarios, integración, cobertura ≥70% | `tests/*` | `.agents/prompts/qa-agent.md` | ✅ Activo |
| 🔍 Code Review | `code-review-backend` | Revisión Node/Express — convenciones SGDEA | `routes/`, `services/`, `schema/` (lectura), `docs/HITOS.md` | `.agents/prompts/code-review-backend.md` | ✅ Activo |
| 🎯 Product Owner | `product-owner` | Validar requisito vs entrega | `PROXIMA_TAREA.md` (lectura), `docs/` | `.agents/prompts/product-owner.md` | ✅ Activo |

> **Nota:** El Performance Agent solo aplica al repo frontend. No aplica al backend.

---

## 📋 Orden de ejecución en el Gate (Fase 3)

```
Paso ejecutado por backend-dev
         ↓
    HANDOFF_NOTES
         ↓
  code-review-backend   ← APROBADO o RECHAZADO
         ↓ (si APROBADO)
      qa-agent          ← QA APROBADO / ADVERTENCIA / RECHAZADO
         ↓ (si no RECHAZADO)
  security-agent        ← APROBADO o BLOQUEADO
         ↓ (si implementó endpoint que el usuario consume)
   product-owner        ← PO APROBADO o RECHAZADO
         ↓ (si todo OK)
       COMMIT
```

---

## 📋 Fase 1 — Diseño (antes del código)

```
Orquestador redacta borrador PROXIMA_TAREA.md
         ↓
      architect         ← ARQUITECTURA APROBADA o RECHAZADA
         ↓ (si RECHAZADA → vuelve a borrador)
  Se publica PROXIMA_TAREA.md con sello ✅
         ↓
     Fase 2 — Ejecución
```

---

## 📋 Protocolo de Handoff

Al finalizar cada paso, el agente ejecutor DEBE entregar un bloque estructurado:

```markdown
## HANDOFF_NOTES — [Nombre del Agente] — Paso [N]

### Lo implementado
- [bullet 1]
- [bullet 2]
- [bullet 3 máx]

### Contratos/Dependencias para el siguiente agente
- [Endpoint: método, URL, response type]
- [Schema modificado: campo, tipo]

### Decisiones tomadas
- [Decisión]: [Justificación]

### Riesgos y advertencias
- [Riesgo detectado o advertencia para el frontend-dev o el siguiente paso]
```

---

## 📋 Protocolo Anti-Redundancias

Antes de crear cualquier archivo nuevo, el agente responde mentalmente:

1. ¿Existe ya un endpoint similar en `routes/`?
2. ¿Puedo extender un service existente en vez de crear uno nuevo?
3. ¿Este helper ya existe en `lib/`?
4. ¿Esta dependencia npm es necesaria o puedo resolverlo con módulos nativos de Node.js?
5. ¿Este schema ya tiene estos campos y solo necesito expandirlo?

Si la respuesta a cualquier pregunta es "sí", debe justificar por qué igualmente crea el archivo nuevo.

---

## 📋 Instrucciones para actualizar este catálogo

Solo el orquestador puede actualizar este archivo. Para añadir un agente especialista temporal:
1. Definirlo con `define_subagent` usando el system_prompt del archivo de prompts correspondiente
2. Añadir una fila a la tabla con estado `🔄 Temporal`
3. Cuando ya no se necesite, marcarlo `❌ Archivado`
