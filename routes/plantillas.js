const express = require("express");
const router = express.Router();
const Plantilla = require("../schema/plantilla");
const { jsonResponse } = require("../lib/jsonResponse");

const PlantillaHistorico = require("../schema/plantillaHistorico");

// Listar plantillas de la empresa activa
router.get("/", async (req, res) => {
  const empresaId = req.header("X-Empresa-ID");
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  try {
    const plantillas = await Plantilla.find({ empresaId, activa: true });
    res.json(jsonResponse(200, { plantillas }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener plantillas" }));
  }
});

// Crear nueva plantilla
router.post("/", async (req, res) => {
  const { nombre, descripcion, contenidoHtml } = req.body;
  const empresaId = req.header("X-Empresa-ID");

  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  if (!nombre || !contenidoHtml) {
    return res.status(400).json(jsonResponse(400, { error: "Nombre y contenido HTML son requeridos" }));
  }

  try {
    const nuevaPlantilla = new Plantilla({
      nombre,
      descripcion,
      contenidoHtml,
      empresaId,
      versionActual: 1
    });
    await nuevaPlantilla.save();

    res.status(201).json(jsonResponse(201, { plantilla: nuevaPlantilla }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear la plantilla" }));
  }
});

// Actualizar plantilla con versionado (Snapshot)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, contenidoHtml, comentario } = req.body;
  const empresaId = req.header("X-Empresa-ID");

  try {
    const plantillaExistente = await Plantilla.findOne({ _id: id, empresaId });
    if (!plantillaExistente) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }

    // 1. Guardar Snapshot de la versión anterior
    const snapshot = new PlantillaHistorico({
      plantillaId: id,
      version: plantillaExistente.versionActual,
      datosVersion: {
        nombre: plantillaExistente.nombre,
        descripcion: plantillaExistente.descripcion,
        contenidoHtml: plantillaExistente.contenidoHtml,
      },
      modificadoPor: req.user.id,
      comentario: comentario || "Actualización manual"
    });
    await snapshot.save();

    // 2. Actualizar documento principal e incrementar versión
    plantillaExistente.nombre = nombre || plantillaExistente.nombre;
    plantillaExistente.descripcion = descripcion || plantillaExistente.descripcion;
    plantillaExistente.contenidoHtml = contenidoHtml || plantillaExistente.contenidoHtml;
    plantillaExistente.versionActual += 1;
    
    await plantillaExistente.save();

    res.json(jsonResponse(200, { 
      message: "Plantilla actualizada y versionada correctamente",
      plantilla: plantillaExistente 
    }));

  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la plantilla" }));
  }
});

// Obtener historial de versiones
router.get("/:id/historial", async (req, res) => {
  const { id } = req.params;
  const empresaId = req.header("X-Empresa-ID");

  try {
    const historial = await PlantillaHistorico.find({ plantillaId: id })
      .sort({ version: -1 })
      .populate("modificadoPor", "name");
    
    res.json(jsonResponse(200, { historial }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener historial" }));
  }
});

// Clonar una versión histórica (checkout)
router.post("/:id/clonar/:version", async (req, res) => {
  const { id, version } = req.params;
  const empresaId = req.header("X-Empresa-ID");

  try {
    // 1. Obtener los datos de la versión histórica
    const versionHistorica = await PlantillaHistorico.findOne({ plantillaId: id, version });
    if (!versionHistorica) {
      return res.status(404).json(jsonResponse(404, { error: "Versión no encontrada en el historial" }));
    }

    const plantillaActual = await Plantilla.findOne({ _id: id, empresaId });
    if (!plantillaActual) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla actual no encontrada" }));
    }

    // 2. Guardar snapshot de la versión que vamos a sobrescribir
    const snapshot = new PlantillaHistorico({
      plantillaId: id,
      version: plantillaActual.versionActual,
      datosVersion: {
        nombre: plantillaActual.nombre,
        descripcion: plantillaActual.descripcion,
        contenidoHtml: plantillaActual.contenidoHtml,
      },
      modificadoPor: req.user.id,
      comentario: `Restauración automática desde versión ${version}`
    });
    await snapshot.save();

    // 3. Restaurar los datos e incrementar versión
    plantillaActual.nombre = versionHistorica.datosVersion.nombre;
    plantillaActual.descripcion = versionHistorica.datosVersion.descripcion;
    plantillaActual.contenidoHtml = versionHistorica.datosVersion.contenidoHtml;
    plantillaActual.versionActual += 1;
    
    await plantillaActual.save();

    res.json(jsonResponse(200, { 
      message: `Versión ${version} restaurada correctamente como versión ${plantillaActual.versionActual}`,
      plantilla: plantillaActual 
    }));

  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al restaurar versión" }));
  }
});

// Obtener detalle de una plantilla
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const empresaId = req.header("X-Empresa-ID");

  try {
    const plantilla = await Plantilla.findOne({ _id: id, empresaId });
    if (!plantilla) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }
    res.json(jsonResponse(200, { plantilla }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener la plantilla" }));
  }
});

module.exports = router;
