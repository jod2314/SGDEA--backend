const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Expediente = require("../schema/expediente");
const Documento = require("../schema/documento");

// --- Gestión de Expedientes Electrónicos ---

// CREATE - Abrir un nuevo expediente
router.post("/", async (req, res) => {
  const { codigo, titulo, descripcion, idTRDSerie, codigoTRDSerie, nombreTRDSerie, nombreSubserie } = req.body;

  try {
    const newExpediente = new Expediente({
      empresa: req.user.empresaId,
      creadoPor: req.user.id,
      codigo,
      titulo,
      descripcion,
      idTRDSerie,
      codigoTRDSerie,
      nombreTRDSerie,
      nombreSubserie,
      estado: 'Abierto',
      fechaApertura: new Date(),
      documentos: []
    });

    await newExpediente.save();
    res.json(jsonResponse(200, { data: newExpediente }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear expediente: " + error.message }));
  }
});

// READ - Listar expedientes de la empresa
router.get("/", async (req, res) => {
  try {
    const expedientes = await Expediente.find({ empresa: req.user.empresaId })
                                      .sort({ fechaCreacion: -1 });
    res.json(jsonResponse(200, { data: expedientes }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al listar expedientes" }));
  }
});

// READ - Obtener expediente con detalle de documentos (Índice)
router.get("/:id", async (req, res) => {
  try {
    const expediente = await Expediente.findOne({ _id: req.params.id, empresa: req.user.empresaId })
                                     .populate('documentos.documento'); // Traer datos de los documentos
    if (!expediente) {
      return res.status(404).json(jsonResponse(404, { error: "Expediente no encontrado" }));
    }
    res.json(jsonResponse(200, { data: expediente }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener expediente" }));
  }
});

// PATCH - Agregar documento al expediente
router.patch("/:id/agregar-documento", async (req, res) => {
  const { documentoId } = req.body;

  try {
    // Verificar que el documento existe y pertenece a la empresa
    const doc = await Documento.findOne({ _id: documentoId, empresa: req.user.empresaId });
    if (!doc) {
      return res.status(404).json(jsonResponse(404, { error: "Documento no encontrado" }));
    }

    const expediente = await Expediente.findOne({ _id: req.params.id, empresa: req.user.empresaId });
    if (!expediente) {
      return res.status(404).json(jsonResponse(404, { error: "Expediente no encontrado" }));
    }

    if (expediente.estado !== 'Abierto') {
      return res.status(400).json(jsonResponse(400, { error: "No se pueden agregar documentos a un expediente cerrado" }));
    }

    // Agregar al índice
    expediente.documentos.push({
      documento: documentoId,
      fechaVinculacion: new Date()
      // folioInicio y folioFin se calcularían en un sistema real de foliado
    });

    await expediente.save();
    res.json(jsonResponse(200, { data: expediente, message: "Documento agregado al expediente" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al agregar documento" }));
  }
});

// PATCH - Cerrar expediente
router.patch("/:id/cerrar", async (req, res) => {
  try {
    const expediente = await Expediente.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      { 
        $set: { 
          estado: 'Cerrado', 
          fechaCierre: new Date() 
        } 
      },
      { new: true }
    );
    res.json(jsonResponse(200, { data: expediente }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al cerrar expediente" }));
  }
});

module.exports = router;
