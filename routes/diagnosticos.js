const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const Diagnostico = require("../schema/diagnostico");

// CREATE - POST /api/diagnosticos
router.post("/", async (req, res) => {
  try {
    const diagnostico = new Diagnostico({
      ...req.body,
      empresa: req.user.empresaId,
      creadoPor: req.user.id,
    });

    await diagnostico.save();

    res.status(201).json(jsonResponse(201, { data: diagnostico }));

  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: error.message }));
  }
});

// READ - GET /api/diagnosticos
router.get("/", async (req, res) => {
  try {
    const diagnosticos = await Diagnostico.find({ empresa: req.user.empresaId });
    res.json(jsonResponse(200, { data: diagnosticos }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al obtener los diagnósticos." }));
  }
});

module.exports = router;
