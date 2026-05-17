const express = require("express");
const router = express.Router();
const { z } = require("zod");
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

const proyectarBodySchema = z.object({
  entidadId: z.string().optional(),
  datosAdicionales: z.record(z.any()).optional().default({}),
  emitirRadicado: z.boolean().optional().default(true)
});

// Generar documento (Proyección)
router.post("/proyectar/:plantillaId", async (req, res) => {
  const { plantillaId } = req.params;
  const empresaId = req.empresaContext.id; // USO ESTANDARIZADO DEL CONTEXTO (Tenant Isolation)

  try {
    // VALIDACIÓN DE ENTRADA CON ZOD
    const validatedBody = proyectarBodySchema.parse(req.body);
    const { entidadId, datosAdicionales, emitirRadicado } = validatedBody;

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
          try {
            radicado = await emitirRadicadoAtomico('RAD_GENERAL', empresaId, req.user.id, null);
          } catch (e) {
            console.warn("No se pudo emitir radicado atómico:", e.message);
          }
        }
      }
    }

    // 5. Fusionar todos los datos para la plantilla
    const dataContext = {
      empresa: datosMaestrosConsolidados.membrete || {},
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

    // 6. Generar PDF con el motor de fusión protegido
    const { buffer, hash, htmlFinal } = await generarPDFDocumental(plantilla.contenidoHtml, dataContext);

    // 7. Guardar Historial de Emisión (Snapshot Inmutable)
    const registroDocumento = new HistorialDocumento({
      plantillaId: plantilla._id,
      empresaId,
      usuarioId: req.user.id,
      datosUsados: dataContext,
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
      detalles: { radicado, plantilla: plantilla.nombre, hash }
    });

    // 8. Responder con el buffer del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${radicado.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    res.setHeader('X-Integrity-Hash', hash);
    res.send(buffer);

  } catch (error) {
    console.error("ERROR EN PROYECCIÓN:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json(jsonResponse(400, { error: "Datos de entrada inválidos", detalles: error.errors }));
    }
    res.status(500).json(jsonResponse(500, { error: "Fallo crítico al proyectar documento" }));
  }
});

// Listar historial de documentos de la empresa (Paginación por Cursor)
router.get("/historial", async (req, res) => {
  const empresaId = req.empresaContext.id;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const lastId = req.query.lastId; // El cursor es el _id del último elemento de la página anterior

  try {
    const query = { empresaId };
    if (lastId) {
      query._id = { $lt: lastId }; // Asumiendo orden descendente por fecha/id
    }

    const historial = await HistorialDocumento.find(query)
      .populate('plantillaId', 'nombre')
      .populate('usuarioId', 'name')
      .sort({ _id: -1 }) // El _id de MongoDB incluye timestamp y es eficiente para orden cronológico inverso
      .limit(limit);
      
    const hasMore = historial.length === limit;
    const nextCursor = hasMore ? historial[historial.length - 1]._id : null;

    res.json(jsonResponse(200, { 
      historial,
      paginacion: { 
        limit, 
        nextCursor,
        hasMore
      }
    }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener historial" }));
  }
});

module.exports = router;
