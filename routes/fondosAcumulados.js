const express = require("express");
const router = express.Router();
const FondoAcumulado = require("../schema/fondoAcumulado");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

// Listar todos los fondos acumulados de la empresa
router.get("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const fondos = await FondoAcumulado.find({ empresaId }).sort({ createdAt: -1 });
    res.json(jsonResponse(200, { fondos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener los fondos acumulados" }));
  }
});

// Crear un nuevo registro de fondo acumulado
router.post("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigoInventario, seccion, subseccion, asunto, fechasExtremas, soporte, volumen, estadoConservacion } = req.body;

  if (!codigoInventario || !seccion || !asunto) {
    return res.status(400).json(jsonResponse(400, { error: "Los campos codigoInventario, seccion y asunto son obligatorios" }));
  }

  try {
    const nuevoFondo = new FondoAcumulado({
      empresaId,
      codigoInventario,
      seccion,
      subseccion,
      asunto,
      fechasExtremas,
      soporte,
      volumen,
      estadoConservacion
    });

    await nuevoFondo.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'REGISTRAR_FONDO_ACUMULADO',
      detalles: { codigoInventario, asunto },
      req
    });

    res.status(201).json(jsonResponse(201, { fondo: nuevoFondo }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al registrar el fondo acumulado" }));
  }
});

// Eliminar un registro de fondo acumulado
router.delete("/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const fondo = await FondoAcumulado.findOneAndDelete({ _id: req.params.id, empresaId });
    if (!fondo) {
      return res.status(404).json(jsonResponse(404, { error: "Registro no encontrado" }));
    }

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_FONDO_ACUMULADO',
      detalles: { codigoInventario: fondo.codigoInventario, asunto: fondo.asunto },
      req
    });

    res.json(jsonResponse(200, { message: "Registro de fondo acumulado eliminado con éxito" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar el registro de fondo acumulado" }));
  }
});

// Exportar en formato FUID (CSV)
router.get("/exportar-fuid", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const fondos = await FondoAcumulado.find({ empresaId }).sort({ codigoInventario: 1 });

    // Cabecera oficial del FUID simplificado para CSV
    let csvContent = "\uFEFF"; // BOM para soportar tildes en Excel
    csvContent += "Codigo Inventario,Seccion,Subseccion,Asunto / Serie,Fecha Inicial,Fecha Final,Soporte,Cajas,Carpetas,Folios,Estado de Conservacion\n";

    fondos.forEach(f => {
      const fechaIni = f.fechasExtremas?.inicial ? new Date(f.fechasExtremas.inicial).toISOString().split('T')[0] : "";
      const fechaFin = f.fechasExtremas?.final ? new Date(f.fechasExtremas.final).toISOString().split('T')[0] : "";
      
      // Escapar comas en strings
      const escape = (text) => {
        if (!text) return "";
        const formatted = text.replace(/"/g, '""');
        return formatted.includes(',') || formatted.includes('\n') ? `"${formatted}"` : formatted;
      };

      csvContent += `${escape(f.codigoInventario)},${escape(f.seccion)},${escape(f.subseccion)},${escape(f.asunto)},${fechaIni},${fechaFin},${f.soporte || "FISICO"},${f.volumen?.cajas || 0},${f.volumen?.carpetas || 0},${f.volumen?.folios || 0},${f.estadoConservacion || "BUENO"}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=FUID_Historico_Fondos_Acumulados.csv");
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al exportar FUID" }));
  }
});

module.exports = router;
