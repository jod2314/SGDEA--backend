const express = require("express");
const router = express.Router();
const FondoAcumulado = require("../schema/fondoAcumulado");
const DiagnosticoDIA = require("../schema/diagnosticoDIA");
const CEOF = require("../schema/ceof");
const { FVD, TVDConsolidada } = require("../schema/tvd");
const InventarioFUID = require("../schema/inventarioFUID");
const ComiteArchivo = require("../schema/comiteArchivo");
const Actas = require("../schema/actas");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { procesarFuidMasivo, exportarFuidCsv } = require("../services/fondosAcumuladosService");
const { calcularInsumosProyecto, calcularMuestraDIA } = require("../services/fdaCalculosService");
const ActasGeneratorService = require("../services/actasGeneratorService");

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

// Endpoint para cálculo de proyección de Insumos & Bioseguridad (Tapabocas N95 / Nitrilo)
router.post("/calculo-insumos", async (req, res) => {
  try {
    const empresaId = req.empresaContext && req.empresaContext.id;
    const { metrosLineales, diasEstimados, auxiliares } = req.body;
    const resultado = calcularInsumosProyecto(metrosLineales, diasEstimados, auxiliares);
    
    if (empresaId) {
      await DiagnosticoDIA.findOneAndUpdate(
        { empresaId },
        { $set: { proyeccionInsumos: { metrosLineales, diasEstimados, auxiliares, ...resultado } } },
        { new: true, upsert: true }
      );
    }
    
    res.json(jsonResponse(200, { insumos: resultado }));
  } catch (error) {
    console.error("Error calculando insumos:", error);
    res.status(500).json(jsonResponse(500, { error: "Error en el servidor al calcular insumos" }));
  }
});

// Endpoint para cálculo muestral estadístico DIA (Ficha H-12)
router.post("/calculo-muestra-dia", (req, res) => {
  const { totalCarpetasPoblacion, margenError, nivelConfianzaZ } = req.body;
  const resultado = calcularMuestraDIA(totalCarpetasPoblacion, margenError, nivelConfianzaZ);
  res.json(jsonResponse(200, { muestraDIA: resultado }));
});

// Obtener o crear Diagnóstico DIA de la empresa
router.get("/diagnostico-dia", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  try {
    let dia = await DiagnosticoDIA.findOne({ empresaId });
    if (!dia) {
      dia = new DiagnosticoDIA({ empresaId });
      await dia.save();
    }
    res.json(jsonResponse(200, { diagnostico: dia }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener el Diagnóstico DIA" }));
  }
});

// Actualizar Diagnóstico DIA
router.put("/diagnostico-dia", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  try {
    const dia = await DiagnosticoDIA.findOneAndUpdate(
      { empresaId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_DIAGNOSTICO_DIA',
      detalles: { estado: dia.estado },
      req
    });
    res.json(jsonResponse(200, { diagnostico: dia }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar Diagnóstico DIA" }));
  }
});

// Obtener o crear CEOF
router.get("/ceof", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  try {
    let ceof = await CEOF.findOne({ empresaId });
    if (!ceof) {
      ceof = new CEOF({ empresaId });
      await ceof.save();
    }
    res.json(jsonResponse(200, { ceof }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener el CEOF" }));
  }
});

// Actualizar CEOF (Cuestionario de Historia Institucional y Períodos)
router.put("/ceof", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  try {
    const ceof = await CEOF.findOneAndUpdate(
      { empresaId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_CEOF',
      detalles: { estado: ceof.estado },
      req
    });
    res.json(jsonResponse(200, { ceof }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar el CEOF" }));
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
    res.setHeader("Content-Disposition", `attachment; filename=FUID_Fondos_Acumulados_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al exportar el inventario FUID" }));
  }
});

// Importar masivamente vía CSV
router.post("/importar-masivo", upload.single("file"), async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }
  if (!req.file) {
    return res.status(400).json(jsonResponse(400, { error: "No se ha subido ningún archivo" }));
  }

  try {
    const resultado = await procesarFuidMasivo(req.file.buffer, empresaId);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'IMPORTAR_FUID_MASIVO',
      detalles: { procesados: resultado.procesados, erroresCount: resultado.errores.length },
      req
    });

    res.status(200).json(jsonResponse(200, {
      message: "Procesamiento masivo finalizado",
      procesados: resultado.procesados,
      errores: resultado.errores
    }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error en la importación masiva: " + error.message }));
  }
});

// --- COMITÉ DE ARCHIVO ---

router.get("/comite", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  try {
    const comite = await ComiteArchivo.find({ empresaId });
    res.json(jsonResponse(200, { comite }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener comité" }));
  }
});

router.post("/comite", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  
  try {
    const { nombre, cargo, cedula } = req.body;
    const nuevoMiembro = new ComiteArchivo({ empresaId, nombre, cargo, cedula });
    await nuevoMiembro.save();
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user ? req.user.id : null,
      accion: 'CREAR_MIEMBRO_COMITE',
      detalles: { nombre, cargo, cedula },
      req
    });
    
    res.status(201).json(jsonResponse(201, { miembro: nuevoMiembro }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear miembro del comité" }));
  }
});

// --- ACTAS ---

router.post("/actas/generar", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  
  try {
    const { tipoActa } = req.body;
    if (!['CONFORMACION_COMITE', 'APROBACION_TVD'].includes(tipoActa)) {
      return res.status(400).json(jsonResponse(400, { error: "Tipo de acta inválido" }));
    }
    
    const miembros = await ComiteArchivo.find({ empresaId });
    const base64Acta = ActasGeneratorService.generarActaBase64(tipoActa, miembros);
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user ? req.user.id : null,
      accion: 'GENERAR_ACTA_BASE64',
      detalles: { tipoActa },
      req
    });
    
    res.json(jsonResponse(200, { base64: base64Acta }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al generar acta" }));
  }
});

router.post("/actas/subir", async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa" }));
  
  try {
    const { tipoActa, urlPdf } = req.body;
    const nuevaActa = new Actas({ empresaId, tipoActa, urlPdf });
    await nuevaActa.save();
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user ? req.user.id : null,
      accion: 'SUBIR_ACTA',
      detalles: { tipoActa, urlPdf },
      req
    });
    
    res.status(201).json(jsonResponse(201, { acta: nuevaActa }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al guardar acta" }));
  }
});

module.exports = router;
