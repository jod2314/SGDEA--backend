const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Documento = require("../schema/documento");
const TRD = require("../schema/trd");
const mongoose = require('mongoose'); // Import mongoose to use ObjectId

// --- Funcionalidad de Radicación y Gestión de Documentos ---

// Generar un número de radicación consecutivo (simple para empezar)
async function generateRadicacionNumber(empresaId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Buscar el último documento para esa empresa en el mismo mes/año
  const lastDoc = await Documento.findOne({
    empresa: empresaId,
    fechaRadicacion: {
      $gte: new Date(year, today.getMonth(), 1),
      $lt: new Date(year, today.getMonth() + 1, 1),
    }
  }).sort({ numeroRadicacion: -1 }); // Asumiendo que el numeroRadicacion es un string que se puede ordenar lexicográficamente

  let sequence = 1;
  if (lastDoc && lastDoc.numeroRadicacion) {
    const lastSequence = parseInt(lastDoc.numeroRadicacion.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }
  
  return `${year}-${month}-${sequence.toString().padStart(4, '0')}`;
}

// CREATE - Radicar un nuevo documento
router.post("/", async (req, res) => {
  const { 
    tipoDocumento, asunto, descripcion, remitente, destinatario,
    esDigital, rutaArchivo, nombreArchivo, tipoMime, tamanioArchivo,
    ubicacionFisica,
    codigoTRDSerie, nombreTRDSerie // Campos para vincular con TRD
  } = req.body;

  try {
    const numeroRadicacion = await generateRadicacionNumber(req.user.empresaId);
    
    // Buscar la serie en la TRD para calcular retención
    let idTRDSerie = req.body.idTRDSerie; // Si el frontend lo envía directamente
    let fechaVencimientoAG = null;
    let fechaVencimientoAC = null;

    if (idTRDSerie || (codigoTRDSerie && nombreTRDSerie)) {
      const trdActiva = await TRD.findOne({ empresa: req.user.empresaId, activa: true });
      
      let trdItem;
      if (trdActiva) {
          if (idTRDSerie) {
              trdItem = trdActiva.items.id(idTRDSerie);
          } else {
              trdItem = trdActiva.items.find(item => 
                item.codigoSerie === codigoTRDSerie && item.nombreSerie === nombreTRDSerie
              );
              if (trdItem) idTRDSerie = trdItem._id;
          }
      }

      if (trdItem) {
        const now = new Date();
        if (trdItem.retencionArchivoGestion > 0) {
          // Clone date and add years
          fechaVencimientoAG = new Date(now);
          fechaVencimientoAG.setFullYear(fechaVencimientoAG.getFullYear() + trdItem.retencionArchivoGestion);
        }
        
        if (trdItem.retencionArchivoCentral > 0 && fechaVencimientoAG) {
            // Clone AG date and add AC years
            fechaVencimientoAC = new Date(fechaVencimientoAG);
            fechaVencimientoAC.setFullYear(fechaVencimientoAC.getFullYear() + trdItem.retencionArchivoCentral);
        }
      }
    }

    const newDocumento = new Documento({
      empresa: req.user.empresaId,
      creadoPor: req.user.id,
      numeroRadicacion,
      tipoDocumento,
      asunto,
      descripcion,
      remitente,
      destinatario,
      esDigital,
      rutaArchivo,
      nombreArchivo,
      tipoMime,
      tamanioArchivo,
      ubicacionFisica,
      idTRDSerie,
      codigoTRDSerie,
      nombreTRDSerie,
      fechaVencimientoAG,
      fechaVencimientoAC,
      historialEventos: [{ usuario: req.user.id, evento: 'Documento Radicado' }],
    });

    await newDocumento.save();
    res.json(jsonResponse(200, { data: newDocumento }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al radicar el documento: " + error.message }));
  }
});

// READ - Obtener todos los documentos de la empresa
router.get("/", async (req, res) => {
  try {
    const documentos = await Documento.find({ empresa: req.user.empresaId }).sort({ fechaRadicacion: -1 });
    res.json(jsonResponse(200, { data: documentos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener documentos" }));
  }
});

// READ - Obtener un documento por ID
router.get("/:id", async (req, res) => {
  try {
    const documento = await Documento.findOne({ _id: req.params.id, empresa: req.user.empresaId });
    if (!documento) {
      return res.status(404).json(jsonResponse(404, { error: "Documento no encontrado" }));
    }
    res.json(jsonResponse(200, { data: documento }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener el documento" }));
  }
});

// UPDATE - Actualizar un documento
router.patch("/:id", async (req, res) => {
  const { 
    tipoDocumento, asunto, descripcion, remitente, destinatario,
    esDigital, rutaArchivo, nombreArchivo, tipoMime, tamanioArchivo,
    ubicacionFisica,
    codigoTRDSerie, nombreTRDSerie,
    estado // Permite actualizar el estado
  } = req.body;

  try {
    const updatedDocumento = await Documento.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      { 
        $set: {
          tipoDocumento, asunto, descripcion, remitente, destinatario,
          esDigital, rutaArchivo, nombreArchivo, tipoMime, tamanioArchivo,
          ubicacionFisica,
          codigoTRDSerie, nombreTRDSerie,
          estado
        },
        $push: { historialEventos: { usuario: req.user.id, evento: 'Documento Actualizado' } }
      },
      { new: true, runValidators: true }
    );

    if (!updatedDocumento) {
      return res.status(404).json(jsonResponse(404, { error: "Documento no encontrado" }));
    }
    res.json(jsonResponse(200, { data: updatedDocumento }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar documento: " + error.message }));
  }
});

// DELETE - Eliminar un documento
router.delete("/:id", async (req, res) => {
  try {
    const deletedDocumento = await Documento.findOneAndDelete({ _id: req.params.id, empresa: req.user.empresaId });
    if (!deletedDocumento) {
      return res.status(404).json(jsonResponse(404, { error: "Documento no encontrado" }));
    }
    res.json(jsonResponse(200, { message: "Documento eliminado" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar documento" }));
  }
});

module.exports = router;
