const express = require("express");
const router = express.Router();
const Transferencia = require("../schema/transferencia");
const Expediente = require("../schema/expediente");
const { validarAutorizacionJefe } = require("../services/expedienteService");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { 
  obtenerListosTransferenciaPrimaria, 
  obtenerListosTransferenciaSecundaria,
  generarDatosFUID 
} = require("../services/retencionService");

// Obtener expedientes listos para transferencia
router.get("/listos", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipo } = req.query; // PRIMARIA o SECUNDARIA

  try {
    let listos = [];
    if (tipo === 'PRIMARIA') {
      listos = await obtenerListosTransferenciaPrimaria(empresaId);
    } else if (tipo === 'SECUNDARIA') {
      listos = await obtenerListosTransferenciaSecundaria(empresaId);
    } else {
      return res.status(400).json(jsonResponse(400, { error: "Tipo de transferencia no válido" }));
    }

    res.json(jsonResponse(200, { expedientes: listos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al consultar retención" }));
  }
});

// Crear una nueva acta de transferencia (Borrador)
router.post("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipoTransferencia, expedientes, observaciones } = req.body;

  try {
    const nueva = new Transferencia({
      empresaId,
      usuarioId: req.user.id,
      tipoTransferencia,
      expedientes,
      observaciones,
      estado: 'BORRADOR'
    });

    await nueva.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_TRANSFERENCIA',
      detalles: { tipo: tipoTransferencia, count: expedientes.length },
      req
    });

    res.status(201).json(jsonResponse(201, { transferencia: nueva }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear transferencia" }));
  }
});

// Finalizar transferencia y actualizar ubicación de expedientes
router.post("/:id/finalizar", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  
  try {
    const trans = await Transferencia.findOne({ _id: req.params.id, empresaId });
    if (!trans) return res.status(404).json(jsonResponse(404, { error: "Transferencia no encontrada" }));
    if (trans.estado === 'FINALIZADA') return res.status(400).json(jsonResponse(400, { error: "Ya está finalizada" }));

    // Validar configuración de aprobación de jefes a través del servicio
    const autorizado = await validarAutorizacionJefe(empresaId, trans.expedientes, req.user.id, req.user.role);
    if (!autorizado) {
      return res.status(403).json(jsonResponse(403, { 
        error: "Requiere autorización del jefe de área para finalizar la transferencia." 
      }));
    }

    // Nueva ubicación según tipo
    const nuevaUbicacion = trans.tipoTransferencia === 'PRIMARIA' ? 'CENTRAL' : 'HISTORICO';

    // Actualizar todos los expedientes
    await Expediente.updateMany(
      { _id: { $in: trans.expedientes }, empresaId },
      { $set: { ubicacion: nuevaUbicacion } }
    );

    trans.estado = 'FINALIZADA';
    trans.fechaTransferencia = new Date();
    await trans.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'FINALIZAR_TRANSFERENCIA',
      detalles: { id: trans._id, nuevaUbicacion },
      req
    });

    res.json(jsonResponse(200, { message: "Transferencia finalizada y expedientes trasladados", transferencia: trans }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al finalizar transferencia" }));
  }
});

// Obtener datos para el FUID (Inventario)
router.get("/:id/fuid", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const trans = await Transferencia.findOne({ _id: req.params.id, empresaId });
    if (!trans) return res.status(404).json(jsonResponse(404, { error: "No encontrada" }));

    const inventario = await generarDatosFUID(trans.expedientes);
    res.json(jsonResponse(200, { inventario }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al generar FUID" }));
  }
});

module.exports = router;
