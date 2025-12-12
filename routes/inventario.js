const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const UnidadConservacion = require("../schema/unidadConservacion");

// --- CRUD para Unidades de Conservación (Inventario) ---

// CREATE
router.post("/", async (req, res) => {
  try {
    const newUnidad = new UnidadConservacion({ 
      ...req.body, 
      empresa: req.user.empresaId,
      creadoPor: req.user.id // Add creator tracking
    });
    await newUnidad.save();
    res.json(jsonResponse(200, { data: newUnidad }));
  } catch (error) {
    // Primero, verificamos si el problema es la ausencia de empresaId en el token
    if (!req.user || !req.user.empresaId) {
      return res.status(400).json(jsonResponse(400, { 
        error: "No se encontró información de la empresa en su sesión. Por favor, cierre sesión y vuelva a iniciarla." 
      }));
    }
    // Si el error es otro, lo mostramos de forma genérica
    res.status(500).json(jsonResponse(500, { error: "Error al crear la unidad: " + error.message }));
  }
});

// READ (all for the company)
router.get("/", async (req, res) => {
  try {
    const unidades = await UnidadConservacion.find({ empresa: req.user.empresaId });
    res.json(jsonResponse(200, { data: unidades }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

// UPDATE
router.patch("/:id", async (req, res) => {
  try {
    const updatedUnidad = await UnidadConservacion.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      req.body,
      { new: true }
    );
    if (!updatedUnidad) {
      return res.status(404).json(jsonResponse(404, { error: "Unidad no encontrada" }));
    }
    res.json(jsonResponse(200, { data: updatedUnidad }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la unidad" }));
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const deletedUnidad = await UnidadConservacion.findOneAndDelete({ 
      _id: req.params.id, 
      empresa: req.user.empresaId 
    });
    if (!deletedUnidad) {
      return res.status(404).json(jsonResponse(404, { error: "Unidad no encontrada" }));
    }
    res.json(jsonResponse(200, { message: "Unidad eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar la unidad" }));
  }
});

module.exports = router;
