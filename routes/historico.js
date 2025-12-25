const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const PeriodoHistorico = require("../schema/periodoHistorico");
const validate = require("../middleware/validate");
const { periodoHistoricoSchema } = require("../validators/schemas");

// GET: Listar todos los periodos históricos de la empresa
router.get("/", async (req, res) => {
  try {
    const periodos = await PeriodoHistorico.find({ empresa: req.user.empresaId }).sort({ fechaInicio: 1 });
    res.json(jsonResponse(200, { data: periodos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener periodos históricos" }));
  }
});

// POST: Crear un nuevo periodo histórico
router.post("/", validate(periodoHistoricoSchema), async (req, res) => {
  try {
    const newPeriodo = new PeriodoHistorico({
      ...req.body,
      empresa: req.user.empresaId,
      creadoPor: req.user.id
    });
    await newPeriodo.save();
    res.json(jsonResponse(200, { data: newPeriodo }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear periodo: " + error.message }));
  }
});

// PATCH: Actualizar periodo
router.patch("/:id", validate(periodoHistoricoSchema), async (req, res) => {
  try {
    const updatedPeriodo = await PeriodoHistorico.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPeriodo) return res.status(404).json(jsonResponse(404, { error: "Periodo no encontrado" }));
    res.json(jsonResponse(200, { data: updatedPeriodo }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar periodo" }));
  }
});

// DELETE: Eliminar periodo
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await PeriodoHistorico.findOneAndDelete({ _id: req.params.id, empresa: req.user.empresaId });
    if (!deleted) return res.status(404).json(jsonResponse(404, { error: "Periodo no encontrado" }));
    res.json(jsonResponse(200, { message: "Periodo eliminado" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar periodo" }));
  }
});

module.exports = router;
