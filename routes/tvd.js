const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Tvd = require("../schema/tvd");

// Obtener la TVD de la empresa actual
router.get("/", async (req, res) => {
  try {
    const tvd = await Tvd.findOne({ empresa: req.user.empresaId });
    if (!tvd) {
      return res.json(jsonResponse(200, { data: { items: [] } }));
    }
    res.json(jsonResponse(200, { data: tvd }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

// Actualizar la TVD
router.patch("/", async (req, res) => {
  const { items } = req.body;

  try {
    let tvd = await Tvd.findOne({ empresa: req.user.empresaId });

    if (tvd) {
      // Actualizar existente
      tvd.items = items;
      await tvd.save();
    } else {
      // Crear nueva
      tvd = new Tvd({
        empresa: req.user.empresaId,
        creadoPor: req.user.id,
        items: items
      });
      await tvd.save();
    }
    
    res.json(jsonResponse(200, { data: tvd }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la TVD: " + error.message }));
  }
});

module.exports = router;
