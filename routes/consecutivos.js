const express = require("express");
const router = express.Router();
const ConsecutivoConfig = require("../schema/consecutivos/ConsecutivoConfig");
const ConsecutivoLog = require("../schema/consecutivos/ConsecutivoLog");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { emitirRadicadoAtomico } = require("../services/radicacionService");

// Listar configuraciones de consecutivos
router.get("/config", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const configs = await ConsecutivoConfig.find({ empresaId }).sort({ codigo: 1 });
    res.json(jsonResponse(200, { consecutivos: configs }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener configuraciones" }));
  }
});

// Crear nueva configuración
router.post("/config", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigo, nombre, mascara, reglaReinicio } = req.body;

  try {
    const nuevaConfig = new ConsecutivoConfig({
      empresaId,
      codigo: codigo.toUpperCase(),
      nombre,
      mascara,
      reglaReinicio
    });
    
    await nuevaConfig.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_CONFIG_CONSECUTIVO',
      detalles: { codigo: nuevaConfig.codigo, mascara }
    });

    res.status(201).json(jsonResponse(201, { consecutivo: nuevaConfig }));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json(jsonResponse(400, { error: "Ya existe un consecutivo con ese código en esta empresa." }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al crear configuración" }));
  }
});

// Actualizar configuración
router.put("/config/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { nombre, mascara, reglaReinicio } = req.body;

  try {
    const config = await ConsecutivoConfig.findOneAndUpdate(
      { _id: req.params.id, empresaId },
      { nombre, mascara, reglaReinicio },
      { new: true }
    );

    if (!config) return res.status(404).json(jsonResponse(404, { error: "Configuración no encontrada" }));

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'EDITAR_CONFIG_CONSECUTIVO',
      detalles: { codigo: config.codigo, mascara }
    });

    res.json(jsonResponse(200, { consecutivo: config }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar configuración" }));
  }
});

// Emitir un nuevo número (Simulación manual / Endpoint directo)
router.post("/emitir/:codigo", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigo } = req.params;
  const { documentoRefId } = req.body;

  try {
    const radicado = await emitirRadicadoAtomico(codigo.toUpperCase(), empresaId, req.user.id, documentoRefId);
    res.status(201).json(jsonResponse(201, { radicado }));
  } catch (error) {
    console.error(error);
    if (error.message.includes("no encontrada")) {
      return res.status(404).json(jsonResponse(404, { error: error.message }));
    }
    res.status(500).json(jsonResponse(500, { error: error.message || "Error al emitir radicado" }));
  }
});

// Obtener historial/log de un consecutivo
router.get("/log/:configId", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const logs = await ConsecutivoLog.find({ consecutivoId: req.params.configId, empresaId })
      .populate('usuarioId', 'name username')
      .sort({ createdAt: -1 })
      .limit(100);
      
    res.json(jsonResponse(200, { logs }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener historial" }));
  }
});

// Anular un número
router.post("/anular/:logId", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  
  try {
    const log = await ConsecutivoLog.findOneAndUpdate(
      { _id: req.params.logId, empresaId },
      { estado: 'ANULADO' },
      { new: true }
    );

    if (!log) return res.status(404).json(jsonResponse(404, { error: "Registro no encontrado" }));

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ANULAR_RADICADO',
      detalles: { numero: log.numeroEmitido }
    });

    res.json(jsonResponse(200, { message: "Radicado anulado con éxito", log }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al anular radicado" }));
  }
});

module.exports = router;
