const express = require("express");
const router = express.Router();
const Plantilla = require("../schema/plantilla");
const Entidad = require("../schema/entidad");
const Empresa = require("../schema/empresa");
const DatoMaestro = require("../schema/datoMaestro");
const HistorialDocumento = require("../schema/historialDocumento");
const TRD = require("../schema/tablaRetencionDocumental");
const { generarPDFDocumental } = require("../services/generadorDocumentos");
const { emitirRadicadoAtomico } = require("../services/radicacionService");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

// Generar documento (Proyección)
router.post("/proyectar/:plantillaId", async (req, res) => {
  const { plantillaId } = req.params;
  const { entidadId, datosAdicionales, emitirRadicado = true } = req.body;
  const empresaId = req.headers["x-empresa-id"];

  try {
    // 1. Obtener Plantilla y validar contexto
    const plantilla = await Plantilla.findOne({ _id: plantillaId, empresaId }).populate('subserieId');
    if (!plantilla) return res.status(404).json(jsonResponse(404, { error: "Plantilla no encontrada" }));

    // 2. Obtener Datos Maestros de la empresa y consolidarlos
    const maestros = await DatoMaestro.find({ empresaId });
    const datosMaestrosConsolidados = {};
    maestros.forEach(m => {
      datosMaestrosConsolidados[m.tipo.toLowerCase()] = m.datos;
    });

    // 3. Obtener Datos de la Entidad (Tercero)
    let datosEntidad = {};
    if (entidadId) {
      const entidad = await Entidad.findOne({ _id: entidadId, empresaId });
      if (entidad) datosEntidad = entidad.toObject();
    }

    // 4. Resolver Código TRD y Emitir Radicado Atómico (si aplica)
    let radicado = "SIN-RADICADO";
    let trdInfo = null;

    if (plantilla.subserieId) {
      const trdEntry = await TRD.findOne({ empresaId, subserieId: plantilla.subserieId._id })
        .populate('dependenciaId');
      
      if (trdEntry) {
        trdInfo = {
          codigo: trdEntry.codigoTRD,
          dependencia: trdEntry.dependenciaId.nombreDependencia
        };

        if (emitirRadicado) {
          // Emitir radicado usando el motor atómico. 
          // Se usa un código de configuración estándar o uno personalizado por subserie
          try {
            radicado = await emitirRadicadoAtomico('RAD_GENERAL', empresaId, req.user.id, null);
          } catch (e) {
            console.warn("No se pudo emitir radicado atómico:", e.message);
            // Si no hay config RAD_GENERAL, usamos uno temporal o fallamos según política
          }
        }
      }
    }

    // 5. Fusionar todos los datos para la plantilla
    const dataContext = {
      empresa: datosMaestrosConsolidados.membrete || {}, // Fallback a membrete si existe
      maestros: datosMaestrosConsolidados,
      entidad: datosEntidad,
      documento: {
        radicado,
        trd: trdInfo?.codigo || "N/A",
        fecha: new Date().toLocaleDateString('es-CO'),
        anio: new Date().getFullYear().toString()
      },
      ...datosAdicionales
    };

    // 6. Generar PDF con el motor de fusión
    const { buffer, hash, htmlFinal } = await generarPDFDocumental(plantilla.contenidoHtml, dataContext);

    // 7. Guardar Historial de Emisión (Snapshot Inmutable)
    const registroDocumento = new HistorialDocumento({
      plantillaId: plantilla._id,
      empresaId,
      usuarioId: req.user.id,
      datosUsados: dataContext, // Snapshot completo de los datos en ese momento
      hashIntegridad: hash,
      codigoTRD: trdInfo?.codigo || "",
      numeroRadicado: radicado,
      tipoArchivo: 'PDF'
    });
    await registroDocumento.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'PROYECTAR_DOCUMENTO',
      detalles: { 
        radicado, 
        plantilla: plantilla.nombre, 
        hash 
      }
    });

    // 8. Responder con el buffer del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${radicado.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    res.setHeader('X-Integrity-Hash', hash);
    res.send(buffer);

  } catch (error) {
    console.error("ERROR EN PROYECCIÓN:", error);
    res.status(500).json(jsonResponse(500, { error: "Fallo crítico al proyectar documento", debug: error.message }));
  }
});

// Listar historial de documentos de la empresa
router.get("/historial", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const historial = await HistorialDocumento.find({ empresaId })
      .populate('plantillaId', 'nombre')
      .populate('usuarioId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(jsonResponse(200, { historial }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener historial" }));
  }
});
