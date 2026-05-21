# Reglas del Orquestador — Backend SGDEA

## Scope Permitido

Los subagentes invocados para este repo **SOLO** pueden modificar archivos dentro de:

```
backend/
├── routes/               ✅ PERMITIDO — Definición de rutas Express
├── services/             ✅ PERMITIDO — Lógica de negocio pesada
├── middleware/           ✅ PERMITIDO — Middlewares de Express
├── schema/               ✅ PERMITIDO — Modelos Mongoose
├── lib/                  ✅ PERMITIDO — Librerías internas (audit.js, etc.)
├── validators/           ✅ PERMITIDO — Esquemas Zod de validación
├── auth/                 ✅ PERMITIDO — Lógica de autenticación JWT
├── scripts/              ✅ PERMITIDO — Scripts de utilidad/seeders
├── index.js              ⚠️  SOLO con aprobación explícita del usuario
├── package.json          ✅ PERMITIDO (solo para añadir dependencias aprobadas)
├── .env.example          ✅ PERMITIDO
└── docs/                 ✅ PERMITIDO (HITOS.md, CHANGELOG.md, walkthrough.md)
```

## Archivos PROHIBIDOS para subagentes

```
backend/
├── .env                  ❌ NUNCA modificar (contiene secretos reales)
├── .git/                 ❌ NUNCA modificar manualmente
├── node_modules/         ❌ NUNCA modificar
├── .agents/              ❌ NUNCA modificar desde un subagente
└── banter_text_dump.txt  ❌ Archivo de datos fuente — no modificar
```

## Convenciones CRÍTICAS (SGDEA)

1. **Auditoría obligatoria**: Toda operación POST/PUT/DELETE DEBE invocar:
   ```javascript
   await registrarAuditoria(req, 'ACCIÓN', { datos })
   ```
2. **Contexto de empresa**: Las rutas operativas DEBEN usar `verifyEmpresaContext`:
   ```javascript
   router.use(verifyToken, verifyEmpresaContext)
   const empresaId = req.empresaContext.id
   ```
3. **Servicios**: Nunca pongas lógica pesada en las rutas — úsala en `services/`
4. **Respuestas**: Usar siempre el helper `jsonResponse`:
   ```javascript
   return jsonResponse(res, 200, { data })
   ```
5. **Aislamiento multi-tenant**: Todo query a MongoDB DEBE filtrar por `empresaId`
6. **Comentarios**: En español

## Tipos de Commit Permitidos

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactorización sin cambio funcional |
| `security` | Parche de seguridad |
| `docs` | Documentación |
| `test` | Tests |
| `chore` | Mantenimiento (deps, config) |
| `schema` | Cambio de esquema de base de datos |

## Criterio de Aceptación General

Un paso se considera completado cuando:
- El servidor arranca sin errores (`node index.js`)
- Los endpoints responden correctamente probados con curl/Postman
- La auditoría se registra correctamente en MongoDB
- Los cambios están reflejados en `docs/HITOS.md`
