const express = require("express");
const router = express.Router();
const Dependencia = require("../schema/dependencia");
const SerieDocumental = require("../schema/serieDocumental");
const SubserieDocumental = require("../schema/subserieDocumental");
const TRD = require("../schema/tablaRetencionDocumental");
const { jsonResponse } = require("../lib/jsonResponse");

// --- DEPENDENCIAS ---

// Obtener todas las dependencias de una empresa
router.get("/dependencias", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));

  try {
    const dependencias = await Dependencia.find({ empresaId }).sort({ codigoDependencia: 1 });
    res.json(jsonResponse(200, { dependencias }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener dependencias" }));
  }
});

// Crear dependencia
router.post("/dependencias", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigoDependencia, nombreDependencia, dependenciaPadreId, esJuntaDirectiva } = req.body;

  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));

  try {
    const nueva = new Dependencia({
      empresaId,
      codigoDependencia,
      nombreDependencia,
      dependenciaPadreId: dependenciaPadreId || null,
      esJuntaDirectiva
    });
    await nueva.save();
    res.status(201).json(jsonResponse(201, { dependencia: nueva }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear dependencia" }));
  }
});

// Actualizar dependencia
router.put("/dependencias/:id", async (req, res) => {
  const { codigoDependencia, nombreDependencia, dependenciaPadreId, esJuntaDirectiva, estado } = req.body;
  try {
    const actualizada = await Dependencia.findByIdAndUpdate(
      req.params.id,
      { codigoDependencia, nombreDependencia, dependenciaPadreId: dependenciaPadreId || null, esJuntaDirectiva, estado },
      { new: true }
    );
    res.json(jsonResponse(200, { dependencia: actualizada }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar dependencia" }));
  }
});

// Eliminar dependencia
router.delete("/dependencias/:id", async (req, res) => {
  try {
    // Verificar si tiene sub-dependencias
    const tieneHijos = await Dependencia.exists({ dependenciaPadreId: req.params.id });
    if (tieneHijos) {
      return res.status(400).json(jsonResponse(400, { error: "No se puede eliminar una dependencia que tiene sub-dependencias" }));
    }
    
    await Dependencia.findByIdAndDelete(req.params.id);
    res.json(jsonResponse(200, { message: "Dependencia eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar dependencia" }));
  }
});

// --- SERIES Y SUBSERIES ---

// Obtener series
router.get("/series", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const series = await SerieDocumental.find({ empresaId }).sort({ codigoSerie: 1 });
    res.json(jsonResponse(200, { series }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener series" }));
  }
});

// Crear serie
router.post("/series", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;

  try {
    const nueva = new SerieDocumental({
      empresaId,
      codigoSerie,
      nombreSerie,
      tiempoRetencionGestion,
      tiempoRetencionCentral,
      disposicionFinal,
      origen: 'manual'
    });
    await nueva.save();
    res.status(201).json(jsonResponse(201, { serie: nueva }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear serie" }));
  }
});

// Actualizar serie
router.put("/series/:id", async (req, res) => {
  const { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;
  try {
    const actualizada = await SerieDocumental.findByIdAndUpdate(
      req.params.id,
      { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal },
      { new: true }
    );
    res.json(jsonResponse(200, { serie: actualizada }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar serie" }));
  }
});

// Eliminar serie
router.delete("/series/:id", async (req, res) => {
  try {
    // Verificar si tiene subseries
    const tieneSubseries = await SubserieDocumental.exists({ serieId: req.params.id });
    if (tieneSubseries) {
      return res.status(400).json(jsonResponse(400, { error: "No se puede eliminar una serie que tiene subseries" }));
    }
    await SerieDocumental.findByIdAndDelete(req.params.id);
    res.json(jsonResponse(200, { message: "Serie eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar serie" }));
  }
});

// Obtener subseries de una serie
router.get("/series/:serieId/subseries", async (req, res) => {
  try {
    const subseries = await SubserieDocumental.find({ serieId: req.params.serieId }).sort({ codigoSubserie: 1 });
    res.json(jsonResponse(200, { subseries }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener subseries" }));
  }
});

// Crear subserie
router.post("/subseries", async (req, res) => {
  const { serieId, codigoSubserie, nombreSubserie } = req.body;
  try {
    const nueva = new SubserieDocumental({ serieId, codigoSubserie, nombreSubserie });
    await nueva.save();
    res.status(201).json(jsonResponse(201, { subserie: nueva }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear subserie" }));
  }
});

// Eliminar subserie
router.delete("/subseries/:id", async (req, res) => {
  try {
    await SubserieDocumental.findByIdAndDelete(req.params.id);
    res.json(jsonResponse(200, { message: "Subserie eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar subserie" }));
  }
});

// Importar catálogo BANTER
router.post("/importar-banter", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  
  const seriesBanter = [
    { 
      codigo: '01', 
      nombre: 'ACCIONES CONSTITUCIONALES',
      subseries: [
        { codigo: '01', nombre: 'Acciones de Cumplimiento' },
        { codigo: '02', nombre: 'Acciones de Grupo' },
        { codigo: '03', nombre: 'Acciones Populares' },
        { codigo: '04', nombre: 'Acciones de Tutela' },
      ]
    },
    { 
      codigo: '02', 
      nombre: 'ACTAS',
      subseries: [
        { codigo: '01', nombre: 'Actas de Comité Directivo' },
        { codigo: '02', nombre: 'Actas de Comité de Contratación' },
      ]
    },
    { 
      codigo: '03', 
      nombre: 'ACTOS ADMINISTRATIVOS',
      subseries: [
        { codigo: '01', nombre: 'Resoluciones' },
        { codigo: '02', nombre: 'Circulares' },
      ]
    },
    {
      codigo: '04',
      nombre: 'CONTRATOS',
      subseries: [
        { codigo: '01', nombre: 'Contratos de Obra' },
        { codigo: '02', nombre: 'Contratos de Prestación de Servicios' },
        { codigo: '03', nombre: 'Contratos de Suministro' },
      ]
    }
  ];

  try {
    for (const ser of seriesBanter) {
      let serieDoc = await SerieDocumental.findOne({ empresaId, codigoSerie: ser.codigo });
      
      if (!serieDoc) {
        serieDoc = new SerieDocumental({
          empresaId,
          codigoSerie: ser.codigo,
          nombreSerie: ser.nombre,
          origen: 'BANTER',
          tiempoRetencionGestion: 2,
          tiempoRetencionCentral: 8,
          disposicionFinal: 'Conservación Total'
        });
        await serieDoc.save();
      }

      for (const sub of ser.subseries) {
        const existeSub = await SubserieDocumental.exists({ serieId: serieDoc._id, codigoSubserie: sub.codigo });
        if (!existeSub) {
          const nuevaSub = new SubserieDocumental({
            serieId: serieDoc._id,
            codigoSubserie: sub.codigo,
            nombreSubserie: sub.nombre
          });
          await nuevaSub.save();
        }
      }
    }
    res.json(jsonResponse(200, { message: "Catálogo BANTER importado con éxito" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al importar catálogo BANTER" }));
  }
});

// --- TRD ---

// Configurar TRD (vincular dependencia con subserie)
router.post("/trd", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { dependenciaId, subserieId } = req.body;

  try {
    const dep = await Dependencia.findById(dependenciaId);
    const sub = await SubserieDocumental.findById(subserieId).populate('serieId');
    
    if (!dep || !sub) return res.status(404).json(jsonResponse(404, { error: "Dependencia o Subserie no encontrada" }));

    const codigoTRD = `${dep.codigoDependencia}-${sub.serieId.codigoSerie}-${sub.codigoSubserie}`;

    const nuevaTRD = new TRD({
      empresaId,
      dependenciaId,
      subserieId,
      codigoTRD
    });
    await nuevaTRD.save();

    res.status(201).json(jsonResponse(201, { trd: nuevaTRD }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear TRD" }));
  }
});

// Listar TRD de la empresa
router.get("/trd", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const listado = await TRD.find({ empresaId })
      .populate('dependenciaId')
      .populate({
        path: 'subserieId',
        populate: { path: 'serieId' }
      });
    res.json(jsonResponse(200, { trd: listado }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener TRD" }));
  }
});

// Eliminar entrada de TRD
router.delete("/trd/:id", async (req, res) => {
  try {
    await TRD.findByIdAndDelete(req.params.id);
    res.json(jsonResponse(200, { message: "Entrada de TRD eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar TRD" }));
  }
});

module.exports = router;
