const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Tvd = require("../schema/tvd");

// Obtener la TVD de la empresa actual
router.get("/", async (req, res) => {
  try {
    const tvd = await Tvd.findOne({ empresaId: req.user.empresaId });
    if (!tvd) {
      // Si no existe, se puede crear una vacía
      const newTvd = new Tvd({ empresaId: req.user.empresaId, filas: [] });
      await newTvd.save();
      return res.json(jsonResponse(200, { data: newTvd }));
    }
    res.json(jsonResponse(200, { data: tvd }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor" }));
  }
});

// Actualizar la TVD (en este caso, reemplazando las filas)
router.patch("/", async (req, res) => {
  const { filas } = req.body;

  try {
    const tvd = await Tvd.findOneAndUpdate(
      { empresaId: req.user.empresaId },
      { filas },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(jsonResponse(200, { data: tvd }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la TVD" }));
  }
});

module.exports = router;
