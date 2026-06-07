const express = require('express');
const router = express.Router();
const { jsonResponse } = require('../lib/jsonResponse');
const { registrarAuditoria } = require('../lib/audit');
const {
  obtenerEstadoIntervencion,
  actualizarTareaChecklist,
  registrarContingencia,
  generarActaIntervencion
} = require('../services/intervencionFondoService');

// Obtener el estado del asistente de intervención de fondos acumulados
router.get('/estado', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  try {
    const wizard = await obtenerEstadoIntervencion(empresaId);
    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener el estado del asistente de intervención' }));
  }
});

// Marcar/desmarcar una tarea del checklist de intervención
router.post('/tarea', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { tareaId, completado } = req.body;
  if (!tareaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el identificador de la tarea (tareaId)' }));
  }

  try {
    const wizard = await actualizarTareaChecklist(empresaId, tareaId, completado);
    
    // Registrar auditoría forense con req
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_TAREA_CHECKLIST',
      detalles: { tareaId, completado },
      req
    });

    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al actualizar la tarea de la intervención' }));
  }
});

// Registrar contingencias o incidentes (humedad, plagas, datación)
router.post('/contingencia', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { contingenciaId, detalles } = req.body;
  if (!contingenciaId || !detalles) {
    return res.status(400).json(jsonResponse(400, { error: 'Faltan campos requeridos (contingenciaId o detalles)' }));
  }

  try {
    const wizard = await registrarContingencia(empresaId, contingenciaId, detalles);

    // Registrar auditoría con req
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_REGISTRAR_CONTINGENCIA',
      detalles: { contingenciaId },
      req
    });

    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al registrar contingencia de intervención' }));
  }
});

// Generar y oficializar actas de intervención física (Comité, Desinfección, Eliminación)
router.post('/generar-acta', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { tipoActa, datos } = req.body;
  if (!tipoActa || !datos) {
    return res.status(400).json(jsonResponse(400, { error: 'Faltan campos requeridos (tipoActa o datos)' }));
  }

  try {
    const { buffer, docId } = await generarActaIntervencion(empresaId, tipoActa, datos, req.user.id);

    // Registrar auditoría forense
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_GENERAR_ACTA',
      detalles: { tipoActa, docId },
      req
    });

    // Devolver el buffer del PDF/A
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ACTA_${tipoActa}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al generar acta oficial de intervención' }));
  }
});

module.exports = router;
