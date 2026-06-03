const express = require("express");
const router = express.Router();
const ActaEliminacion = require("../schema/disposicion/ActaEliminacion");
const Expediente = require("../schema/expediente");
const { validarAutorizacionJefe } = require("../services/expedienteService");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { obtenerListosDisposicionFinal, procesarEliminacionMasiva } = require("../services/disposicionService");

// Listar expedientes listos para disposición final
router.get("/listos", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const expedientes = await obtenerListosDisposicionFinal(empresaId);
    res.json(jsonResponse(200, { expedientes }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al consultar disposición final" }));
  }
});

// Crear borrador de Acta de Eliminación
router.post("/eliminar", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { numeroActa, expedientesIds, justificacion } = req.body;

  try {
    const expedientesData = await Expediente.find({ _id: { $in: expedientesIds }, empresaId });
    
    const nuevaActa = new ActaEliminacion({
      empresaId,
      numeroActa,
      usuarioResponsableId: req.user.id,
      justificacion,
      expedientesEliminados: expedientesData.map(e => ({
        expedienteId: e._id,
        nombreExpediente: e.nombreExpediente,
        codigoTRD: e.codigoTRD,
        fechaApertura: e.fechaApertura,
        fechaCierre: e.fechaCierre
      }))
    });

    await nuevaActa.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_ACTA_ELIMINACION',
      detalles: { numeroActa, count: expedientesIds.length },
      req
    });

    res.status(201).json(jsonResponse(201, { acta: nuevaActa }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear acta de eliminación" }));
  }
});

// Aprobar acta y ejecutar eliminación
router.post("/eliminar/:id/aprobar", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];

  try {
    const acta = await ActaEliminacion.findOne({ _id: req.params.id, empresaId });
    if (!acta) return res.status(404).json(jsonResponse(404, { error: "Acta no encontrada" }));
    if (acta.estado === 'APROBADA') return res.status(400).json(jsonResponse(400, { error: "El acta ya fue ejecutada." }));

    // Validar configuración de aprobación de jefes a través del servicio
    const expedientesIds = acta.expedientesEliminados.map(e => e.expedienteId);
    const autorizado = await validarAutorizacionJefe(empresaId, expedientesIds, req.user.id, req.user.role);
    if (!autorizado) {
      return res.status(403).json(jsonResponse(403, { 
        error: "Requiere autorización del jefe de área para aprobar la eliminación de los expedientes." 
      }));
    }

    const ids = acta.expedientesEliminados.map(e => e.expedienteId);
    const procesados = await procesarEliminacionMasiva(empresaId, ids, acta._id);

    acta.estado = 'APROBADA';
    acta.fechaEliminacion = new Date();
    await acta.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'EJECUTAR_ELIMINACION',
      detalles: { numeroActa: acta.numeroActa, expedientesAfectados: procesados },
      req
    });

    res.json(jsonResponse(200, { message: "Eliminación ejecutada con éxito", acta }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al ejecutar eliminación" }));
  }
});

// Transferencia masiva a HISTORICO (Conservación Total)
router.post("/conservar-historico", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { expedientesIds } = req.body;

  try {
    const result = await Expediente.updateMany(
      { _id: { $in: expedientesIds }, empresaId, ubicacion: 'CENTRAL' },
      { $set: { ubicacion: 'HISTORICO' } }
    );

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'TRANSFERENCIA_HISTORICO_MASIVA',
      detalles: { count: result.modifiedCount },
      req
    });

    res.json(jsonResponse(200, { message: `${result.modifiedCount} expedientes trasladados a Archivo Histórico.` }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al realizar transferencia histórica" }));
  }
});

module.exports = router;
