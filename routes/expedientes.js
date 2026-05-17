const express = require("express");
const router = express.Router();
const Expediente = require("../schema/expediente");
const HistorialDocumento = require("../schema/historialDocumento");
const TRD = require("../schema/tablaRetencionDocumental");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const { generarIndiceElectronicoXML } = require("../services/expedienteService");

// Listar expedientes de la empresa
router.get("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const expedientes = await Expediente.find({ empresaId })
      .populate('dependenciaId', 'nombreDependencia')
      .populate('subserieId', 'nombreSubserie')
      .sort({ createdAt: -1 });
    res.json(jsonResponse(200, { expedientes }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener expedientes" }));
  }
});

// Crear nuevo expediente
router.post("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { nombreExpediente, subserieId, descripcion } = req.body;

  try {
    // Validar vinculación TRD
    const trd = await TRD.findOne({ empresaId, subserieId }).populate('dependenciaId');
    if (!trd) {
      return res.status(400).json(jsonResponse(400, { 
        error: "Subserie no vinculada en la TRD. Configure la TRD antes de abrir un expediente." 
      }));
    }

    const nuevoExpediente = new Expediente({
      empresaId,
      nombreExpediente,
      codigoTRD: trd.codigoTRD,
      dependenciaId: trd.dependenciaId._id,
      subserieId,
      descripcion,
      responsableId: req.user.id
    });

    await nuevoExpediente.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ABRIR_EXPEDIENTE',
      detalles: { nombre: nombreExpediente, codigoTRD: trd.codigoTRD }
    });

    res.status(201).json(jsonResponse(201, { expediente: nuevoExpediente }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear expediente" }));
  }
});

// Obtener detalle de expediente y sus documentos
router.get("/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const expediente = await Expediente.findOne({ _id: req.params.id, empresaId })
      .populate('dependenciaId')
      .populate('subserieId');
    
    if (!expediente) return res.status(404).json(jsonResponse(404, { error: "Expediente no encontrado" }));

    const documentos = await HistorialDocumento.find({ expedienteId: expediente._id })
      .sort({ createdAt: 1 })
      .populate('usuarioId', 'name');

    res.json(jsonResponse(200, { expediente, documentos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener detalle" }));
  }
});

// Vincular documento existente a un expediente
router.post("/:id/vincular-documento", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { documentoId } = req.body;

  try {
    const expediente = await Expediente.findOne({ _id: req.params.id, empresaId });
    if (!expediente) return res.status(404).json(jsonResponse(404, { error: "Expediente no encontrado" }));
    if (expediente.estado === 'CERRADO') return res.status(403).json(jsonResponse(403, { error: "El expediente está cerrado y no permite adiciones." }));

    const doc = await HistorialDocumento.findOneAndUpdate(
      { _id: documentoId, empresaId },
      { expedienteId: expediente._id },
      { new: true }
    );

    if (!doc) return res.status(404).json(jsonResponse(404, { error: "Documento no encontrado" }));

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'VINCULAR_DOC_EXPEDIENTE',
      detalles: { expediente: expediente.nombreExpediente, radicado: doc.numeroRadicado }
    });

    res.json(jsonResponse(200, { message: "Documento vinculado", documento: doc }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al vincular documento" }));
  }
});

// Cerrar expediente y generar Índice Electrónico XML
router.post("/:id/cerrar", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];

  try {
    const expediente = await Expediente.findOne({ _id: req.params.id, empresaId });
    if (!expediente) return res.status(404).json(jsonResponse(404, { error: "Expediente no encontrado" }));
    if (expediente.estado === 'CERRADO') return res.status(400).json(jsonResponse(400, { error: "El expediente ya está cerrado." }));

    // Generar XML
    const xml = await generarIndiceElectronicoXML(expediente);

    expediente.estado = 'CERRADO';
    expediente.fechaCierre = new Date();
    expediente.indiceXml = xml;
    await expediente.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CERRAR_EXPEDIENTE',
      detalles: { nombre: expediente.nombreExpediente, hashIndice: 'Calculado en XML' }
    });

    res.json(jsonResponse(200, { message: "Expediente cerrado con éxito e índice generado", expediente }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al cerrar expediente" }));
  }
});

module.exports = router;
