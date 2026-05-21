# 📋 Catálogo de Agentes — Backend SGDEA

Registro de todos los subagentes disponibles o descargados para el repo backend.

| Agente | Especialidad | Scope Permitido | Estado | Fecha |
|--------|-------------|-----------------|--------|-------|
| `self` (heredado) | Full-Stack general | Todos los archivos | ✅ Activo | Sistema |

---

## Instrucciones para Añadir un Nuevo Agente

Cuando el orquestador detecte que necesita un especialista no listado:
1. Definir el agente con `define_subagent` usando el system_prompt adecuado
2. Añadir una fila a esta tabla con el nombre, especialidad y fecha
3. El agente queda disponible para el resto de la sesión

## Agentes Planificados (Backlog Fase 2)

| Agente | Especialidad | Prioridad |
|--------|-------------|-----------|
| Code Review Agent | Revisión de código Node.js/Express | Alta |
| MongoDB Migration Agent | Gestión de cambios de esquema | Alta |
| Security Agent | OWASP Top 10, detección de secretos hardcodeados | Media |
| Dependency Audit Agent | `npm audit` automático post-instalación | Media |
