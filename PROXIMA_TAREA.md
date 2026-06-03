# 📍 PRÓXIMA TAREA: Implementación del Asistente Metodológico de SGD Paso a Paso

## Objetivo
Implementar la arquitectura completa del **Plan de Trabajo Guiado (Asistente de Implementación)** en frontend y backend. Esto incluye el árbol de decisiones del cuestionario dinámico (Paso 0 al 7), la máquina de estados, el cálculo de madurez archivística ponderado en tiempo real, el checklist automatizado de tareas, y el bloqueo de navegación en organizaciones que no hayan finalizado el onboarding base.

---

## 🛠️ Desglose de Pasos Técnicos

### Paso 1: Backend — Esquema de Datos y Máquina de Estados
*   **Subagente:** `self` (heredado)
*   **Archivos a Modificar/Crear:**
    *   `[MODIFY] C:/web/backend/schema/onboardingWizard.js`
*   **Criterio de Aceptación:**
    *   El esquema debe soportar el mapeo dinámico de respuestas (árbol de decisiones de los pasos 0 al 7), el listado de tareas del checklist generados automáticamente y el porcentaje de progreso calculado.
*   **Punto de Rollback:** `git checkout schema/onboardingWizard.js`

### Paso 2: Backend — Servicio de Progreso y Árbol de Respuestas
*   **Subagente:** `self` (heredado)
*   **Archivos a Modificar/Crear:**
    *   `[MODIFY] C:/web/backend/services/onboardingService.js`
*   **Criterio de Aceptación:**
    *   Implementación de la lógica del árbol de decisiones. Cada respuesta válida debe avanzar el estado o reubicar al paso correcto según las opciones seleccionadas, agregar tareas automáticas al checklist de la empresa y calcular la fórmula ponderada de madurez archivística.
*   **Punto de Rollback:** `git restore services/onboardingService.js`

### Paso 3: Backend — Controlador y Endpoints
*   **Subagente:** `self` (heredado)
*   **Archivos a Modificar/Crear:**
    *   `[MODIFY] C:/web/backend/routes/onboarding.js`
*   **Criterio de Aceptación:**
    *   Creación/Actualización de los endpoints `GET /assistant/state` (obtiene progreso, tareas y paso actual) y `POST /assistant/answer` (guarda la respuesta del paso activo, recalcula madurez y actualiza el checklist).
    *   Invocación correcta de `registrarAuditoria({req})` y verificación estricta de `X-Empresa-ID`.
*   **Punto de Rollback:** `git restore routes/onboarding.js`

### Paso 4: Frontend — Interfaz del Plan de Trabajo Guiado (Wizard)
*   **Subagente:** `self` (heredado)
*   **Archivos a Modificar/Crear:**
    *   `[MODIFY] C:/web/frontend/src/routes/AsistenteOnboarding.tsx`
*   **Criterio de Aceptación:**
    *   Renderizado en formato layout con barra lateral de pasos (0 al 7) y sus respectivos indicadores visuales (Pendiente, En curso, Completado).
    *   Cuestionario central interactivo con botones de opción múltiple (sin entradas de texto libre excepto miembros del comité).
    *   Conexión de los botones contextuales ("Generar Acta", "Subir FUID") a las API correspondientes usando `auth.request()`.
*   **Punto de Rollback:** `git restore src/routes/AsistenteOnboarding.tsx`

### Paso 5: Frontend — Bloqueo de Navegación y Contexto de Onboarding
*   **Subagente:** `self` (heredado)
*   **Archivos a Modificar/Crear:**
    *   `[MODIFY] C:/web/frontend/src/layout/PortalLayout.tsx`
    *   `[MODIFY] C:/web/frontend/src/layout/Drawer.tsx`
*   **Criterio de Aceptación:**
    *   Bloqueo de accesos directos a los módulos operativos en el menú lateral si `onboardingCompleted` es `false`.
    *   Redirección automática hacia `/onboarding` al ingresar a una organización nueva o pendiente de implementación básica.
*   **Punto de Rollback:** `git checkout src/layout/PortalLayout.tsx src/layout/Drawer.tsx`

### Paso 6: Verificación, QA y Commits
*   **Subagente:** `self` (heredado)
*   **Acciones:**
    *   Ejecutar comprobación de tipos `tsc --noEmit` en frontend.
    *   Correr la suite de pruebas automatizadas en frontend (`npm test`) y backend (`npm test`).
    *   Hacer commits independientes por hitos y subir a los repositorios remotos.

---

## 🧪 Plan de Validación y Pruebas
1.  **Prueba de Árbol de Decisiones:** Simular el flujo de un usuario que selecciona "No poseo fondos acumulados" en el Paso 1 y validar que el sistema salte directamente al Paso 3 (Comité) y actualice la madurez archivística a la proporción calculada.
2.  **Prueba de Tareas:** Verificar que al seleccionar "Sí, fondos desordenados" en el Paso 1, la tarea "Realizar inventario preliminar de fondos acumulados" se añada al checklist y se marque en la base de datos.
3.  **Compilación y Tests:** Asegurar `exit code 0` en compilaciones de Typescript y que la suite de Vitest no reporte fallas.
