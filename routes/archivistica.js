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
    res.status(500).json(jsonResponse(500, { error: "Error al crear dependencia" }));
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

// Obtener subseries de una serie
router.get("/series/:serieId/subseries", async (req, res) => {
  try {
    const subseries = await SubserieDocumental.find({ serieId: req.params.serieId }).sort({ codigoSubserie: 1 });
    res.json(jsonResponse(200, { subseries }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener subseries" }));
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

module.exports = router;
