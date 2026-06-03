# 📋 PRÓXIMA TAREA — Backend SGDEA

## Objetivo
Implementar las extensiones del modelo de datos para fondos acumulados (TVD), la custodia física de expedientes con localización granular, la asignación de jefes de dependencias, la carga de imágenes para Tiptap, y el control configurable de aprobaciones multi-tenant.

---

## Pasos Técnicos de Ejecución

### Paso 1: Esquemas Mongoose de Fondos Acumulados y Ubicación Física [COMPLETADO]
* **Descripción:** 
  1. Crear el nuevo modelo `FondoAcumulado` para el inventario histórico.
  2. Modificar el esquema `Expediente` para incluir el objeto `ubicacionFisica` (sección, bloque, estante, peldaño, caja, carpeta).
* **Subagente Asignado:** `self` (Orquestador principal/Backend specialist)
* **Archivos Modificados:**
  * `backend/schema/fondoAcumulado.js` [NEW]
  * `backend/schema/expediente.js` [MODIFY]
* **Criterio de Aceptación:** Los modelos se compilan correctamente y se integran en la base de datos sin alterar los registros existentes.
* **Punto de Rollback:** Revertir los cambios en `schema/expediente.js` y eliminar `schema/fondoAcumulado.js`.

### Paso 2: Configuración de Empresa y Estructura Organizacional (Jefes) [COMPLETADO]
* **Descripción:** 
  1. Añadir el campo `configuracionSGD.requiereAutorizacionJefe` al esquema `Empresa`.
  2. Añadir `jefeDependenciaId` al esquema `Dependencia`.
* **Subagente Asignado:** `self` (Orquestador principal)
* **Archivos Modificados:**
  * `backend/schema/empresa.js` [MODIFY]
  * `backend/schema/dependencia.js` [MODIFY]
* **Criterio de Aceptación:** La base de datos permite registrar el ID de un usuario como jefe de dependencia y configurar si requiere aprobación.
* **Punto de Rollback:** Revertir los cambios en `schema/empresa.js` y `schema/dependencia.js`.

### Paso 3: Endpoint de Carga de Imágenes en Local [COMPLETADO]
* **Descripción:** 
  1. Configurar `multer` para subida de archivos de imágenes en local (`backend/uploads/`).
  2. Crear ruta `POST /documentos/upload-imagen` que reciba la imagen, la guarde y devuelva la URL local.
  3. Configurar Express para servir la carpeta `uploads` de manera estática.
* **Subagente Asignado:** `self`
* **Archivos Modificados:**
  * `backend/index.js` [MODIFY]
  * `backend/routes/documentos.js` [MODIFY]
* **Criterio de Aceptación:** El endpoint recibe imágenes, las guarda en el disco local y permite acceder a ellas a través de HTTP GET.
* **Punto de Rollback:** Revertir los cambios en `index.js` y `routes/documentos.js`, y limpiar la carpeta `backend/uploads/`.

### Paso 4: Lógica de Negocio y Flujo del Asistente [COMPLETADO]
* **Descripción:**
  1. Modificar el servicio y ruta del onboarding para contemplar la bandera y preguntas sobre fondos acumulados en `respuestas.fondosAcumulados`.
  2. Integrar lógica de aprobación condicional para transferencias y eliminación si `requiereAutorizacionJefe` está activo o no.
* **Subagente Asignado:** `self`
* **Archivos Modificados:**
  * `backend/routes/onboarding.js` [MODIFY]
  * `backend/services/onboardingService.js` [MODIFY]
  * `backend/routes/transferencias.js` [MODIFY]
  * `backend/routes/disposicion.js` [MODIFY]
* **Criterio de Aceptación:** El asistente registra el estado de fondos acumulados y el flujo de autorizaciones responde según la configuración de la empresa.
* **Punto de Rollback:** Revertir los cambios de lógica en los archivos de servicios y rutas correspondientes.

### Paso 5: Gate de Calidad y Pruebas Unitarias
* **Descripción:**
  1. Ejecutar el suite de pruebas Jest + Supertest (`npm test`).
  2. Garantizar que todos los cambios pasen el gate sin warnings ni bloqueos en PowerShell.
* **Subagente Asignado:** `self`
* **Archivos Modificados:** Ninguno (ejecución de scripts)
* **Criterio de Aceptación:** El script `run_tests.ps1` finaliza con código de salida 0.
