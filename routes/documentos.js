const express = require("express");
const router = express.Router();
const Plantilla = require("../schema/plantilla");
const Entidad = require("../schema/entidad");
const Empresa = require("../schema/empresa");
const HistorialDocumento = require("../schema/historialDocumento");
const { generarPdf } = require("../services/generadorDocumentos");
const { jsonResponse } = require("../lib/jsonResponse");

// Generar documento (Proyección)
router.post("/proyectar/:plantillaId", async (req, res) => {
  const { plantillaId } = req.params;
  const { entidadId, datosAdicionales } = req.body;
  const empresaId = req.header("X-Empresa-ID");

  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  try {
    // 1. Obtener Plantilla
    const plantilla = await Plantilla.findOne({ _id: plantillaId, empresaId });
    if (!plantilla) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }

    // 2. Obtener Datos de la Empresa (Maestros)
    const empresa = await Empresa.findById(empresaId);
    
    // 3. Obtener Datos de la Entidad (si aplica)
    let datosEntidad = {};
    if (entidadId) {
      const entidad = await Entidad.findOne({ _id: entidadId, empresaId });
      if (entidad) {
        datosEntidad = entidad.toObject();
      }
    }

    // 4. Fusionar todos los datos
    const datosFinales = {
      empresa: empresa.toObject(),
      entidad: datosEntidad,
      ...datosAdicionales,
      fecha_actual: new Date().toLocaleDateString('es-CO')
    };

    // 5. Generar PDF
    const { buffer, hash } = await generarPdf(plantilla.contenidoHtml, datosFinales);

    // 6. Guardar Historial de Emisión
    const nuevoHistorial = new HistorialDocumento({
      plantillaId,
      datosUsados: datosFinales,
      usuarioId: req.user.id,
      empresaId,
      hashIntegridad: hash,
      tipoArchivo: 'PDF'
    });
    await nuevoHistorial.save();

    // 7. Responder con el PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${plantilla.nombre.replace(/\s+/g, '_')}.pdf"`);
    res.setHeader('X-Document-Hash', hash);
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al generar el documento" }));
  }
});

module.exports = router;
