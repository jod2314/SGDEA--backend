const express = require("express");
const router = express.Router();
const { jsonResponse } = require("../lib/jsonResponse");
const ValuationEngine = require("../lib/engines/valuationEngine");
const UnidadConservacion = require("../schema/unidadConservacion");
const TRD = require("../schema/trd");

// Check valuation for a specific item (simulation)
router.post("/simulate", async (req, res) => {
  const { item, trdItem } = req.body;
  
  if (!item || !trdItem) {
    return res.status(400).json(jsonResponse(400, { error: "Se requieren item y trdItem" }));
  }

  try {
    const result = ValuationEngine.calculateDisposition(item, trdItem);
    res.json(jsonResponse(200, { data: result }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en el motor de valoración" }));
  }
});

// Get valuation report for the entire inventory
router.get("/report", async (req, res) => {
  try {
    // 1. Get active TRD
    const trd = await TRD.findOne({ empresa: req.user.empresaId, activa: true });
    if (!trd) {
      return res.status(404).json(jsonResponse(404, { error: "No hay TRD activa para realizar la valoración" }));
    }

    // 2. Build TRD map for fast lookup
    const trdMap = {};
    trd.items.forEach(t => {
      // Key: "CodeSerie-CodeSubserie" (normalized)
      const key = `${t.codigoSerie}-${t.codigoSubserie || ''}`;
      trdMap[key] = t;
    });

    // 3. Get Inventory Items
    const items = await UnidadConservacion.find({ empresa: req.user.empresaId });

    // 4. Process Batch
    const report = items.map(item => {
        // Try to match based on codes stored in inventory (assuming they exist)
        // Note: Inventory schema might need strict 'codigoSerie' fields if not present
        // Fallback: simple mapping simulation or using 'codigo' field
        
        // Asumiendo que 'codigo' en inventario es 'Serie.Subserie'
        const parts = (item.codigo || '').split('.');
        const serie = parts[0];
        const subserie = parts[1] || '';
        
        // This matching logic depends on data quality. 
        // For now, we try exact match or return 'Not Found'
        // In a real scenario, we might need a more robust matcher.
        
        // Temporary: try to find any matching series code in the TRD map keys
        let trdItem = null;
        // Simple lookup attempt (adjust based on real data structure)
        const key = `${serie}-${subserie}`;
        trdItem = trdMap[key];

        // If not found by code, we can't value it automatically
        if (!trdItem) {
            return {
                _id: item._id,
                asunto: item.asunto,
                calculable: false,
                reason: "Código TRD no encontrado"
            };
        }

        return ValuationEngine.calculateDisposition(item, trdItem);
    });

    res.json(jsonResponse(200, { data: report }));

  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error generando reporte de valoración" }));
  }
});

module.exports = router;
