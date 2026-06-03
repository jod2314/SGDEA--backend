const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { 
  obtenerEstadoWizard, 
  guardarRespuestasYPasar, 
  generarDocumentoFundacional 
} = require("../services/onboardingService");

// Controladores y rutas del asistente de onboarding (asistente de configuración)

// Obtener estado actual del wizard
const handleGetState = async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el encabezado X-Empresa-ID" }));
  }

  try {
    const wizard = await obtenerEstadoWizard(empresaId);
    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    return res.status(500).json(jsonResponse(500, { error: "Error al obtener estado del asistente" }));
  }
};

// Guardar respuestas de un paso y avanzar
const handleAnswer = async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el encabezado X-Empresa-ID" }));
  }

  const { paso, respuestas } = req.body;
  if (paso === undefined || respuestas === undefined) {
    return res.status(400).json(jsonResponse(400, { error: "Faltan datos requeridos (paso o respuestas)" }));
  }

  try {
    const wizard = await guardarRespuestasYPasar(empresaId, paso, respuestas);
    
    // Registrar auditoría forense con req completo
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ASISTENTE_RESPONDER',
      detalles: { paso },
      req
    });

    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    return res.status(500).json(jsonResponse(500, { error: "Error al guardar respuestas" }));
  }
};

// Definir rutas principales
router.get("/assistant/state", handleGetState);
router.post("/assistant/answer", handleAnswer);

// Rutas de compatibilidad (alias para el frontend anterior)
router.get("/estado", handleGetState);
router.post("/responder", handleAnswer);

// Generar documento del asistente
router.post("/generar/:tipo", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el encabezado X-Empresa-ID" }));
  }

  const { tipo } = req.params;

  try {
    const buffer = await generarDocumentoFundacional(empresaId, tipo.toUpperCase(), req.user.id);
    
    // Registrar auditoría con req completo
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ASISTENTE_GENERAR_DOC',
      detalles: { tipo },
      req
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SISTEMA_${tipo}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: "Error al generar documento del asistente" }));
  }
});

module.exports = router;
