# 📚 Lecciones Aprendidas — Backend SGDEA
## Protocolo de Orquestación v2.0

Este archivo registra causa raíz de fallos, patrones descubiertos y decisiones de arquitectura que deben recordarse. El orquestador lo actualiza al finalizar cada hito donde ocurra algo relevante.

---

## Formato de registro

```markdown
### [AAAA-MM-DD] — Título de la lección
**Contexto:** ¿Qué se estaba haciendo?
**Qué falló / Qué se descubrió:** Descripción precisa
**Causa raíz:** Por qué ocurrió
**Solución aplicada:** Qué se hizo para resolverlo
**Patrón / Regla derivada:** Lo que debe recordarse para el futuro
**Agente involucrado:** [nombre del agente]
```

---

## Registro

*(Este archivo se poblará automáticamente a partir del primer hito donde ocurra un fallo o se descubra un patrón relevante.)*

---

## 🔍 Búsqueda rápida por etiqueta

- `[AUDITORIA]` — Problema con registrarAuditoria
- `[MULTITENANCY]` — Filtro empresaId faltante o incorrecto
- `[SCHEMA]` — Problema con Mongoose schema o migración
- `[SERVICIO]` — Lógica en rutas en vez de servicios
- `[SEGURIDAD]` — Vulnerabilidad o secreto detectado
- `[VALIDACION]` — Validación de entrada faltante
- `[JWT]` — Problema con tokens o autenticación
- `[ARQUITECTURA]` — Decisión de diseño importante
- `[REDUNDANCIA]` — Endpoint o servicio duplicado detectado
