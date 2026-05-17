const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const { 
  obtenerEstadisticasProduccion, 
  obtenerEstadoInventario, 
  obtenerActividadAuditoria, 
  obtenerIndiceMadurez 
} = require("../services/reportService");

// Endpoint consolidado para el Dashboard Principal
router.get("/dashboard", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  
  try {
    const [produccion, inventario, auditoria, madurez] = await Promise.all([
      obtenerEstadisticasProduccion(empresaId),
      obtenerEstadoInventario(empresaId),
      obtenerActividadAuditoria(empresaId),
      obtenerIndiceMadurez(empresaId)
    ]);

    res.json(jsonResponse(200, { 
      produccion, 
      inventario, 
      auditoria, 
      madurez 
    }));
  } catch (error) {
    console.error("Error al generar dashboard:", error);
    res.status(500).json(jsonResponse(500, { error: "Error al consolidar reportes de gestión" }));
  }
});

// Reporte detallado de producción documental
router.get("/produccion", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const stats = await obtenerEstadisticasProduccion(empresaId);
    res.json(jsonResponse(200, { stats }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener reporte de producción" }));
  }
});

// Reporte de madurez archivística (KPI)
router.get("/madurez", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const kpi = await obtenerIndiceMadurez(empresaId);
    res.json(jsonResponse(200, { kpi }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener KPI de madurez" }));
  }
});

module.exports = router;
