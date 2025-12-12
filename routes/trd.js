const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const TRD = require("../schema/trd");

// --- CRUD para Tablas de Retención Documental (TRD) ---

// Obtener la TRD activa para la empresa actual
router.get("/", async (req, res) => {
  try {
    const trd = await TRD.findOne({ empresa: req.user.empresaId, activa: true });
    if (!trd) {
      return res.json(jsonResponse(200, { data: null }));
    }
    res.json(jsonResponse(200, { data: trd }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor al obtener la TRD" }));
  }
});

// Crear una nueva TRD (y desactiva las anteriores si ya existe una activa)
router.post("/", async (req, res) => {
  const { nombre, items } = req.body;

  if (!nombre || !items || !Array.isArray(items)) {
    return res.status(400).json(jsonResponse(400, { error: "Nombre y items son requeridos para la TRD" }));
  }

  try {
    // Desactivar cualquier TRD activa existente para esta empresa
    await TRD.updateMany({ empresa: req.user.empresaId, activa: true }, { $set: { activa: false } });

    // Crear la nueva TRD
    const newTrd = new TRD({
      empresa: req.user.empresaId,
      creadoPor: req.user.id,
      nombre: nombre,
      items: items,
      activa: true,
      version: 1, // Asumimos que es la primera versión si no hay previas, o se maneja un versionamiento más complejo
    });
    await newTrd.save();
    res.json(jsonResponse(200, { data: newTrd }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear la TRD: " + error.message }));
  }
});

// Actualizar una TRD existente (asumiendo que solo se actualiza la TRD activa)
router.patch("/", async (req, res) => {
  const { nombre, items } = req.body;

  try {
    const trd = await TRD.findOneAndUpdate(
      { empresa: req.user.empresaId, activa: true },
      { 
        $set: { 
          nombre: nombre,
          items: items,
          // No actualizamos creadoPor ni empresa aquí
        },
        $inc: { version: 1 } // Incrementa la versión
      },
      { new: true, runValidators: true }
    );

    if (!trd) {
      return res.status(404).json(jsonResponse(404, { error: "TRD activa no encontrada para actualizar. Cree una nueva." }));
    }
    
    res.json(jsonResponse(200, { data: trd }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la TRD: " + error.message }));
  }
});

// Opcional: Obtener historial de versiones de TRD
router.get("/history", async (req, res) => {
  try {
    const history = await TRD.find({ empresa: req.user.empresaId }).sort({ fechaCreacion: -1 });
    res.json(jsonResponse(200, { data: history }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener historial de TRD" }));
  }
});

module.exports = router;
