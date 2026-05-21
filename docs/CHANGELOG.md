# CHANGELOG — Backend SGDEA

Todos los cambios notables en este proyecto serán documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido
- Sistema de orquestación de agentes (`.agents/`)
  - `stack.config.md` — configuración del stack tecnológico
  - `AGENT_CATALOG.md` — catálogo dinámico de agentes especialistas
  - `orchestrator_rules.md` — reglas de scope y convenciones SGDEA
  - `scripts/run_tests.ps1` — gate de testing (con smoke test de sintaxis JS)
  - `scripts/rollback.ps1` — protocolo de rollback automático
  - `docs/HITOS.md` — registro continuo de hitos
  - `docs/CHANGELOG.md` — este archivo
- `.env.example` — plantilla de variables de entorno sin valores sensibles

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
