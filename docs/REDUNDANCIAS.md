# 🔁 Registro de Redundancias — Backend SGDEA
## Protocolo de Orquestación v2.0

Este archivo registra las duplicaciones detectadas por el Security Agent o el Code Review Agent durante los gates de testing.

---

## Tabla de redundancias activas

| Fecha | Categoría | Severidad | Descripción | Acción recomendada |
|:------|:----------|:---------:|:------------|:-------------------|
| *(se llena automáticamente)* | | | | |

---

## Categorías de redundancia

| Categoría | Descripción |
|:----------|:------------|
| **Endpoint duplicado** | Dos endpoints que devuelven los mismos datos |
| **Servicio duplicado** | Lógica de negocio repetida en dos services |
| **Dependencia innecesaria** | Paquete npm que resuelve lo que ya hace Node.js nativo |
| **Query sin índice** | Query frecuente sobre campo sin índice en MongoDB |
| **Validación duplicada** | Misma validación en la ruta Y en el servicio |

---

## Severidad

| Nivel | Criterio | Acción |
|:------|:---------|:-------|
| **ALTA** | Endpoint duplicado, lógica en rutas (>50 líneas), query sin índice en prod | Resolver antes del siguiente commit |
| **MEDIA** | Servicio duplicado, dependencia innecesaria | Resolver en el próximo hito |
| **BAJA** | Validación duplicada, comentario desactualizado | Resolver en sesión de mantenimiento |

---

## Registro histórico

*(Este archivo se poblará automáticamente cuando el Security Agent o el Code Review Agent detecten redundancias en el gate de testing.)*
