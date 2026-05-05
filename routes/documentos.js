const express = require("express");
const router = express.Router();
const Plantilla = require("../schema/plantilla");
const Entidad = require("../schema/entidad");
const Empresa = require("../schema/empresa");
const HistorialDocumento = require("../schema/historialDocumento");
const TRD = require("../schema/tablaRetencionDocumental");
const { generarPdf, generarCodigoTRD } = require("../services/generadorDocumentos");
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
    const plantilla = await Plantilla.findOne({ _id: plantillaId, empresaId }).populate('subserieId');
    if (!plantilla) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }

    // 2. Obtener Datos de la Empresa (Maestros)
    const empresa = await Empresa.findById(empresaId);
    
    // 3. Resolver Código TRD si la plantilla tiene subserie vinculada
    let datosTRD = null;
    if (plantilla.subserieId) {
      const trdDoc = await TRD.findOne({ 
        empresaId, 
        subserieId: plantilla.subserieId._id 
      }).populate('dependenciaId').populate({
        path: 'subserieId',
        populate: { path: 'serieId' }
      });

      if (!trdDoc) {
        return res.status(400).json(jsonResponse(400, { 
          error: "Configuración TRD incompleta", 
          detalle: `La subserie '${plantilla.subserieId.nombreSubserie}' no ha sido vinculada a ninguna dependencia en la TRD.` 
        }));
      }

      datosTRD = await generarCodigoTRD({
        empresaId,
        codigoDep: trdDoc.dependenciaId.codigoDependencia,
        nombreDep: trdDoc.dependenciaId.nombreDependencia,
        codigoSer: trdDoc.subserieId.serieId.codigoSerie,
        nombreSer: trdDoc.subserieId.serieId.nombreSerie,
        codigoSub: trdDoc.subserieId.codigoSubserie,
        nombreSub: trdDoc.subserieId.nombreSubserie,
        version: plantilla.versionActual,
        anio: new Date().getFullYear().toString()
      });
    }

    // 4. Obtener Datos de la Entidad (si aplica)
    let datosEntidad = {};
    if (entidadId) {
      const entidad = await Entidad.findOne({ _id: entidadId, empresaId });
      if (entidad) {
        datosEntidad = entidad.toObject();
      }
    }

    // 5. Fusionar todos los datos
    const datosFinales = {
      empresa: empresa.toObject(),
      entidad: datosEntidad,
      trd: datosTRD,
      fecha_actual: new Date().toLocaleDateString('es-CO'),
      ...datosAdicionales
    };

    // 6. Generar PDF
    const { buffer, hash } = await generarPdf(plantilla.contenidoHtml, datosFinales);

    // 7. Guardar Historial de Emisión
    const nuevoHistorial = new HistorialDocumento({
      plantillaId,
      datosUsados: datosFinales,
      usuarioId: req.user.id,
      empresaId,
      hashIntegridad: hash,
      codigoTRD: datosTRD ? datosTRD.codigo : "",
      tipoArchivo: 'PDF'
    });
    await nuevoHistorial.save();

    // 8. Responder con el PDF
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
