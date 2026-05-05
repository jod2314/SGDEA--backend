const express = require("express");
const router = express.Router();
const AuditLog = require("../schema/auditLog");
const { jsonResponse } = require("../lib/jsonResponse");

// Listar logs de auditoría de una empresa
router.get("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));

  try {
    const logs = await AuditLog.find({ empresa: empresaId })
      .populate("usuario", "name username")
      .sort({ fecha: -1 })
      .limit(100);
    
    res.json(jsonResponse(200, { logs }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al obtener logs de auditoría" }));
  }
});

module.exports = router;
