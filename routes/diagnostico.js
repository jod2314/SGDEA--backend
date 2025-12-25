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
    conteo,
    // metrosLineales, // No lo leemos del body, dejamos que el backend lo calcule
    insumosProyectados,
    estadoBiologico
  } = req.body;

  try {
    // 1. Buscamos el documento existente
    let diagnostico = await Diagnostico.findOne({ empresa: req.user.empresaId });

    if (!diagnostico) {
      // 2. Si no existe, creamos una nueva instancia
      diagnostico = new Diagnostico({
        empresa: req.user.empresaId,
        creadoPor: req.user.id
      });
    }

    // 3. Actualizamos los campos manualmente para que Mongoose detecte cambios
    if (historiaInstitucional !== undefined) diagnostico.historiaInstitucional = historiaInstitucional;
    if (estructuraAnterior !== undefined) diagnostico.estructuraAnterior = estructuraAnterior;
    if (fechasClave !== undefined) diagnostico.fechasClave = fechasClave;
    if (organigramas !== undefined) diagnostico.organigramas = organigramas;
    if (infraestructura !== undefined) diagnostico.infraestructura = infraestructura;
    if (resumenCCDPropuesto !== undefined) diagnostico.resumenCCDPropuesto = resumenCCDPropuesto;
    if (observaciones !== undefined) diagnostico.observaciones = observaciones;
    
    // Actualizamos conteo para disparar el cálculo
    if (conteo !== undefined) {
      diagnostico.conteo = conteo;
      diagnostico.markModified('conteo'); // Forzamos la detección del cambio para asegurar que el hook se ejecute
    }
    // No asignamos metrosLineales directamente para permitir que el hook lo recalcule
    if (insumosProyectados !== undefined) diagnostico.insumosProyectados = insumosProyectados;
    if (estadoBiologico !== undefined) diagnostico.estadoBiologico = estadoBiologico;

    // 4. Guardamos. Esto dispara el hook 'pre save' del Schema donde está la calculadora.
    await diagnostico.save();

    res.json(jsonResponse(200, { data: diagnostico }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor: " + error.message }));
  }
});

module.exports = router;
