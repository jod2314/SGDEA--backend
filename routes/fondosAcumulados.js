const express = require("express");
const router = express.Router();
const FondoAcumulado = require("../schema/fondoAcumulado");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { procesarFuidMasivo, exportarFuidCsv } = require("../services/fondosAcumuladosService");

// Listar todos los fondos acumulados de la empresa
router.get("/", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }
  try {
    const fondos = await FondoAcumulado.find({ empresaId }).sort({ createdAt: -1 });
    res.json(jsonResponse(200, { fondos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener los fondos acumulados" }));
  }
});

// Crear un nuevo registro de fondo acumulado
router.post("/", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }
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
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }
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
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }
  try {
    const csvContent = await exportarFuidCsv(empresaId);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=FUID_Historico_Fondos_Acumulados.csv");
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al exportar FUID" }));
  }
});


// Importar masivamente fondos acumulados (XLSX, XLS, CSV)
router.post("/importar-masivo", upload.single("archivo"), async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }

  if (!req.file) {
    return res.status(400).json(jsonResponse(400, { error: "No se ha subido ningún archivo" }));
  }

  try {
    const resultado = await procesarFuidMasivo(req.file.buffer, empresaId);

    // Registrar auditoría con el total importado
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: "IMPORTAR_MASIVO_FUID",
      detalles: { 
        totalProcesados: resultado.totalProcesados, 
        totalGuardados: resultado.totalGuardados, 
        totalErrores: resultado.errores.length 
      },
      req
    });

    res.status(200).json(jsonResponse(200, {
      message: `Carga masiva finalizada. Guardados: ${resultado.totalGuardados}, Errores/Advertencias: ${resultado.errores.length}`,
      totalProcesados: resultado.totalProcesados,
      totalGuardados: resultado.totalGuardados,
      errores: resultado.errores
    }));

  } catch (error) {
    console.error("Error en carga masiva de FUID:", error);
    res.status(500).json(jsonResponse(500, { error: error.message || "Error interno al procesar el archivo masivo" }));
  }
});

module.exports = router;


