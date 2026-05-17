const express = require("express");
const router = express.Router();
const AuditLog = require("../schema/auditLog");
const { jsonResponse } = require("../lib/jsonResponse");
const { verificarIntegridadDocumento, obtenerLineaDeTiempo } = require("../services/auditService");

/**
 * Listar logs de auditoría de una empresa con filtros básicos.
 * GET /api/audit?tipoRecurso=PLANTILLA&usuarioId=...
 */
router.get("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipoRecurso, usuarioId, accion } = req.query;

  try {
    const query = { empresa: empresaId };
    if (tipoRecurso) query.tipoRecurso = tipoRecurso;
    if (usuarioId) query.usuario = usuarioId;
    if (accion) query.accion = accion;

    const logs = await AuditLog.find(query)
      .populate("usuario", "name username")
      .sort({ fecha: -1 })
      .limit(200);
    
    res.json(jsonResponse(200, { logs }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener logs de auditoría" }));
  }
});

/**
 * Verificar integridad de un documento específico.
 * GET /api/audit/verificar/:docId
 */
router.get("/verificar/:docId", async (req, res) => {
  try {
    const resultado = await verificarIntegridadDocumento(req.params.docId);
    res.json(jsonResponse(200, resultado));
  } catch (error) {
    res.status(404).json(jsonResponse(404, { error: error.message }));
  }
});

/**
 * Reconstruir línea de tiempo forense de un recurso.
 * GET /api/audit/timeline/:tipo/:id
 */
router.get("/timeline/:tipo/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipo, id } = req.params;

  try {
    const timeline = await obtenerLineaDeTiempo(empresaId, tipo.toUpperCase(), id);
    res.json(jsonResponse(200, { timeline }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al reconstruir línea de tiempo" }));
  }
});

/**
 * Estadísticas rápidas para el dashboard de auditoría.
 * GET /api/audit/stats
 */
router.get("/stats", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const totalEventos = await AuditLog.countDocuments({ empresa: empresaId });
    const ultimas24h = await AuditLog.countDocuments({ 
      empresa: empresaId, 
      fecha: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    
    const accionesTop = await AuditLog.aggregate([
      { $match: { empresa: new require('mongoose').Types.ObjectId(empresaId) } },
      { $group: { _id: "$accion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json(jsonResponse(200, { 
      stats: { totalEventos, ultimas24h, accionesTop } 
    }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener estadísticas" }));
  }
});

module.exports = router;
