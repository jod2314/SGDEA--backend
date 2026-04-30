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
    const plantillas = await Plantilla.find({ empresaId, activa: true }).populate('subserieId');
    res.json(jsonResponse(200, { plantillas }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener plantillas" }));
  }
});

// Crear nueva plantilla
router.post("/", async (req, res) => {
  const { nombre, descripcion, contenidoHtml, subserieId } = req.body;
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
      subserieId,
      versionActual: '0.1',
      estado: 'borrador'
    });
    await nuevaPlantilla.save();

    // Guardar en histórico inicial
    const snapshot = new PlantillaHistorico({
      plantillaId: nuevaPlantilla._id,
      version: '0.1',
      datosVersion: {
        nombre: nuevaPlantilla.nombre,
        descripcion: nuevaPlantilla.descripcion,
        contenidoHtml: nuevaPlantilla.contenidoHtml,
      },
      modificadoPor: req.user.id,
      comentario: "Versión inicial"
    });
    await snapshot.save();

    res.status(201).json(jsonResponse(201, { plantilla: nuevaPlantilla }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear la plantilla" }));
  }
});

// Actualizar plantilla con versionado semántico
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, contenidoHtml, subserieId, comentario } = req.body;
  const empresaId = req.header("X-Empresa-ID");

  try {
    const plantillaExistente = await Plantilla.findOne({ _id: id, empresaId });
    if (!plantillaExistente) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }

    // Calcular nueva versión semántica (0.x)
    const versionActual = plantillaExistente.versionActual || '0.0';
    const [major, minor] = versionActual.split('.').map(Number);
    const nuevaVersion = `${major}.${minor + 1}`;

    // 1. Guardar Snapshot de la versión anterior
    const snapshot = new PlantillaHistorico({
      plantillaId: id,
      version: versionActual,
      datosVersion: {
        nombre: plantillaExistente.nombre,
        descripcion: plantillaExistente.descripcion,
        contenidoHtml: plantillaExistente.contenidoHtml,
      },
      modificadoPor: req.user.id,
      comentario: comentario || "Actualización de contenido"
    });
    await snapshot.save();

    // 2. Actualizar documento principal e incrementar versión
    plantillaExistente.nombre = nombre || plantillaExistente.nombre;
    plantillaExistente.descripcion = descripcion || plantillaExistente.descripcion;
    plantillaExistente.contenidoHtml = contenidoHtml || plantillaExistente.contenidoHtml;
    plantillaExistente.subserieId = subserieId || plantillaExistente.subserieId;
    plantillaExistente.versionActual = nuevaVersion;
    
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
      .sort({ createdAt: -1 })
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
    const versionHistorica = await PlantillaHistorico.findOne({ plantillaId: id, version });
    if (!versionHistorica) {
      return res.status(404).json(jsonResponse(404, { error: "Versión no encontrada en el historial" }));
    }

    const plantillaActual = await Plantilla.findOne({ _id: id, empresaId });
    if (!plantillaActual) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla actual no encontrada" }));
    }

    const [major, minor] = plantillaActual.versionActual.split('.').map(Number);
    const nuevaVersion = `${major}.${minor + 1}`;

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

    plantillaActual.nombre = versionHistorica.datosVersion.nombre;
    plantillaActual.descripcion = versionHistorica.datosVersion.descripcion;
    plantillaActual.contenidoHtml = versionHistorica.datosVersion.contenidoHtml;
    plantillaActual.versionActual = nuevaVersion;
    
    await plantillaActual.save();

    res.json(jsonResponse(200, { 
      message: `Versión ${version} restaurada correctamente como versión ${nuevaVersion}`,
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
    const plantilla = await Plantilla.findOne({ _id: id, empresaId }).populate('subserieId');
    if (!plantilla) {
      return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));
    }
    res.json(jsonResponse(200, { plantilla }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener la plantilla" }));
  }
});

module.exports = router;
