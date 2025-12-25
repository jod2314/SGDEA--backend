const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const EstructuraOrganica = require("../schema/estructuraOrganica");
const validate = require("../middleware/validate");
const { estructuraOrganicaSchema } = require("../validators/schemas");

// GET: Listar estructura orgánica (opcionalmente filtrada por periodo)
router.get("/", async (req, res) => {
  const { periodoId } = req.query;
  const query = { empresa: req.user.empresaId };
  if (periodoId) query.periodoHistorico = periodoId;

  try {
    // Populate 'padre' para mostrar jerarquía si es necesario
    const dependencias = await EstructuraOrganica.find(query)
      .populate('padre', 'nombre codigo')
      .sort({ codigo: 1 });
      
    res.json(jsonResponse(200, { data: dependencias }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener estructura orgánica" }));
  }
});

// POST: Crear una dependencia
router.post("/", validate(estructuraOrganicaSchema), async (req, res) => {
  try {
    const newDependencia = new EstructuraOrganica({
      ...req.body,
      empresa: req.user.empresaId
    });
    await newDependencia.save();
    res.json(jsonResponse(200, { data: newDependencia }));
  } catch (error) {
    // Manejo de duplicados (E11000)
    if (error.code === 11000) {
      return res.status(400).json(jsonResponse(400, { error: "El código de dependencia ya existe en este periodo." }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al crear dependencia: " + error.message }));
  }
});

// DELETE: Eliminar dependencia
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await EstructuraOrganica.findOneAndDelete({ _id: req.params.id, empresa: req.user.empresaId });
    if (!deleted) return res.status(404).json(jsonResponse(404, { error: "Dependencia no encontrada" }));
    res.json(jsonResponse(200, { message: "Dependencia eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar dependencia" }));
  }
});

module.exports = router;
