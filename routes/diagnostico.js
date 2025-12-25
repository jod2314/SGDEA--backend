const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Diagnostico = require("../schema/diagnostico");
const validate = require("../middleware/validate");
const { diagnosticoSchema } = require("../validators/schemas");

// Obtener el diagnóstico de la empresa actual
router.get("/", async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findOne({ empresa: req.user.empresaId });
    if (!diagnostico) {
      return res.status(200).json(jsonResponse(200, { data: null }));
    }
    res.json(jsonResponse(200, { data: diagnostico }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

// Crear o actualizar el diagnóstico (Upsert)
router.patch("/", validate(diagnosticoSchema), async (req, res) => {
  const { 
    historiaInstitucional, 
    estructuraAnterior, 
    fechasClave, 
    organigramas,
    infraestructura,
    resumenCCDPropuesto,
    observaciones,
    // Nuevos campos cuantitativos
    conteo,
    metrosLineales,
    insumosProyectados,
    estadoBiologico
  } = req.body;

  try {
    const diagnostico = await Diagnostico.findOneAndUpdate(
      { empresa: req.user.empresaId },
      {
        $set: {
          historiaInstitucional,
          estructuraAnterior,
          fechasClave,
          organigramas,
          infraestructura,
          resumenCCDPropuesto,
          observaciones,
          // Guardar métricas
          conteo,
          metrosLineales,
          insumosProyectados,
          estadoBiologico,
          empresa: req.user.empresaId,
        },
        $setOnInsert: {
          creadoPor: req.user.id
        }
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(jsonResponse(200, { data: diagnostico }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor: " + error.message }));
  }
});

module.exports = router;
