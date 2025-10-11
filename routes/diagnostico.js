const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Diagnostico = require("../schema/diagnostico");

// Obtener el diagnóstico de la empresa actual
router.get("/", async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findOne({ empresaId: req.user.empresaId });
    if (!diagnostico) {
      return res.status(200).json(jsonResponse(200, { data: null }));
    }
    res.json(jsonResponse(200, { data: diagnostico }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

// Crear o actualizar el diagnóstico (Upsert)
router.patch("/", async (req, res) => {
  const { historiaInstitucional, estructuraAnterior, fechasClave } = req.body;

  try {
    const diagnostico = await Diagnostico.findOneAndUpdate(
      { empresaId: req.user.empresaId },
      {
        historiaInstitucional,
        estructuraAnterior,
        fechasClave,
        empresaId: req.user.empresaId,
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(jsonResponse(200, { data: diagnostico }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

module.exports = router;
