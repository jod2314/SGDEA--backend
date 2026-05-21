# Stack Tecnológico — Backend SGDEA

## Framework y Lenguaje
- Runtime: Node.js
- Framework: Express.js 4
- Lenguaje: JavaScript (CommonJS)

## Base de Datos
- Motor: MongoDB
- ODM: Mongoose 7
- Migraciones: No implementadas (esquemas versionados manualmente)

## Seguridad y Autenticación
- Tokens: JWT (Access + Refresh)
- Aislamiento multi-tenant: Header `X-Empresa-ID` validado por `verifyEmpresaContext.js`
- Hash contraseñas: bcrypt

## Motores Especializados
- Generación PDF/A: `html-pdf-node`
- Índices XML: `xmlbuilder2`
- Integridad documental: `crypto` (SHA-256)
- Importación CSV: `csv-parser`
- Validación: `zod`

## Testing
- Estado actual: ⚠️ SIN TESTS CONFIGURADOS (script `test` es placeholder)
- Framework objetivo: Jest + Supertest
- Cobertura mínima objetivo: 60% (a implementar en Fase 2)

## Servidor
- Puerto: 3000 (configurado en `PORT`)
- Dev server: `npm run dev` (nodemon)
- Entry point: `index.js`

## Convenciones del Proyecto (CRÍTICO)
1. **Auditoría obligatoria**: Toda operación POST/PUT/DELETE invoca `registrarAuditoria` de `lib/audit.js`
2. **Contexto de empresa**: Rutas operativas usan `verifyEmpresaContext` y filtran por `req.empresaContext.id`
3. **Servicios**: Lógica pesada en `backend/services/`
4. **Respuestas**: Usar siempre `jsonResponse(statusCode, body)`
