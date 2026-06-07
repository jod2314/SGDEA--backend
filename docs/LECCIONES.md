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

### [2026-06-07] — Transacciones atómicas de aprobación de TVD y sincronización con SerieDocumental
**Contexto:** Construcción del servicio de aprobación de la Tabla de Valoración Documental (`tvdService.js`) en el backend.
**Qué falló / Qué se descubrió:** Al aprobar la TVD, se requería marcar todas las TVD previas del tenant como `obsoletas` y además propagar las nuevas series aprobadas en la TVD hacia la colección central `SerieDocumental` del tenant. Si alguna serie ya existía con el mismo código en `SerieDocumental`, causaba un error de clave duplicada.
**Causa raíz:** Las series documentales en el backend están indexadas de manera única por `{ empresaId, codigo }`. El guardado normal de Mongoose (`save()`) no maneja colisiones a nivel de base de datos de manera limpia para actualizaciones masivas, lo que rompía la atomicidad si ocurría un error a mitad de camino.
**Solución aplicada:** Se envolvió todo el flujo de aprobación dentro de una transacción nativa de Mongoose (`session.withTransaction()`). Para la propagación de series, en lugar de llamadas a `.create()`, se usó `bulkWrite` con operaciones de tipo `updateOne` configuradas con `upsert: true` filtradas por `{ empresaId, codigo }`. Además, se mapearon dinámicamente los enums de disposición final en el backend para evitar colisiones con Mongoose.
**Patrón / Regla derivada:** Todo flujo de negocio que implique la actualización en masa de colecciones en cascada y que sea crítico para la coherencia (como la aprobación de instrumentos archivísticos oficiales) debe realizarse de forma transaccional y utilizar `upsert` con `bulkWrite` para evitar condiciones de carrera y fallos por claves duplicadas.
**Agente involucrado:** `backend-dev`


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
