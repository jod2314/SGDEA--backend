const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { 
  obtenerEstadoWizard, 
  guardarRespuestasYPasar, 
  generarDocumentoFundacional 
} = require("../services/onboardingService");

// Obtener estado actual del wizard
router.get("/estado", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const wizard = await obtenerEstadoWizard(empresaId);
    res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener estado del asistente" }));
  }
});

// Guardar respuestas de un paso
router.post("/responder", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { paso, respuestas } = req.body;

  try {
    const wizard = await guardarRespuestasYPasar(empresaId, paso, respuestas);
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ASISTENTE_RESPONDER',
      detalles: { paso }
    });

    res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al guardar respuestas" }));
  }
});

// Generar documento del asistente
router.post("/generar/:tipo", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipo } = req.params;

  try {
    const buffer = await generarDocumentoFundacional(empresaId, tipo.toUpperCase(), req.user.id);
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ASISTENTE_GENERAR_DOC',
      detalles: { tipo }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SISTEMA_${tipo}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al generar documento del asistente" }));
  }
});

module.exports = router;
