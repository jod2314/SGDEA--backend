const express = require("express");
const router = express.Router();
const Dependencia = require("../schema/dependencia");
const SerieDocumental = require("../schema/serieDocumental");
const SubserieDocumental = require("../schema/subserieDocumental");
const TRD = require("../schema/tablaRetencionDocumental");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

// Versión: 1.0.1 - Corrección de sintaxis verificada
// --- DEPENDENCIAS ---

const BanterMaster = require("../schema/banterMaster");

// Buscar en el Banco Terminológico Maestro
router.get("/banter/buscar", async (req, res) => {
  const { q, nivel } = req.query;
  try {
    let query = {};
    if (q) {
      query.$or = [
        { nombre: { $regex: q, $options: "i" } },
        { codigo: { $regex: q, $options: "i" } }
      ];
    }
    if (nivel) query.nivel = nivel;

    const sugerencias = await BanterMaster.find(query).limit(10);
    res.json(jsonResponse(200, { sugerencias }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al buscar en BANTER" }));
  }
});

// Obtener sugerencias de series del BANTER por sector comercial
router.get("/banter/sugerencias-sector", async (req, res) => {
  const { sector } = req.query;
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "Falta el contexto de Empresa (X-Empresa-ID)" }));
  }

  if (!sector) {
    return res.status(400).json(jsonResponse(400, { error: "El parámetro de sector es requerido" }));
  }

  // Definir las palabras clave de búsqueda por sector comercial
  const MAPEO_SECTORES = {
    SALUD: ["HISTORIA CLINICA", "HISTORIAS CLINICAS", "SALUD", "MEDIC", "PACIENTE", "REGISTRO MEDICO", "CONSULTA", "FACTURACION", "EVALUACION MEDICA"],
    EDUCACION: ["HISTORIA ACADEMICA", "HISTORIAS ACADEMICAS", "ESTUDIANTE", "GRAD", "CURRICULO", "DOCENTE", "CALIFICACION", "MATRICULA", "EVALUACION ACADEMICA"],
    CONSTRUCCION: ["OBRA", "PLANO", "LICENCIA", "PROYECTO", "INTERVENTOR", "CONSTRUCCION", "INGENIERIA", "BITACORA"],
    FINANCIERO: ["IMPUESTOS", "ESTADOS FINANCIEROS", "BALANCE", "LIBROS CONTABLES", "CONTABILIDAD", "BANCOS", "FACTURA", "CAJA", "PRESUPUESTO", "CARTERA"],
    TECNOLOGIA: ["SOPORTE", "DESARROLLO", "SISTEMAS", "SOFTWARE", "MANTENIMIENTO", "SERVIDOR", "SEGURIDAD", "LICENCIAMIENTO"]
  };

  const sectorNormalizado = sector.toUpperCase().trim();
  const palabrasClave = MAPEO_SECTORES[sectorNormalizado];

  if (!palabrasClave) {
    return res.status(400).json(jsonResponse(400, { error: `Sector comercial '${sector}' no soportado.` }));
  }

  try {
    // Buscar en BanterMaster las series que coincidan en el nombre o sean transversales
    const query = {
      nivel: "SERIE",
      $or: [
        { transversal: true },
        ...palabrasClave.map(palabra => ({
          nombre: { $regex: palabra, $options: "i" }
        }))
      ]
    };

    const seriesSugeridas = await BanterMaster.find(query).sort({ codigo: 1 });
    res.json(jsonResponse(200, { sugerencias: seriesSugeridas }));
  } catch (error) {
    console.error("Error al buscar sugerencias sectoriales de BANTER:", error);
    res.status(500).json(jsonResponse(500, { error: "Error al obtener sugerencias de series" }));
  }
});


// Importar entrada de BANTER al CCD de la empresa (Serie y opcionalmente sus subseries)
router.post("/banter/importar", async (req, res) => {
  const { banterId, incluirSubseries } = req.body;
  const empresaId = req.headers["x-empresa-id"];

  try {
    const item = await BanterMaster.findById(banterId);
    if (!item) return res.status(404).json(jsonResponse(404, { error: "Item de BANTER no encontrado" }));

    if (item.nivel === 'SERIE') {
      let serieDoc = await SerieDocumental.findOne({ empresaId, codigoSerie: item.codigo });
      
      if (!serieDoc) {
        serieDoc = new SerieDocumental({
          empresaId,
          codigoSerie: item.codigo,
          nombreSerie: item.nombre,
          origen: 'BANTER',
          tiempoRetencionGestion: item.retencionGestion,
          tiempoRetencionCentral: item.retencionCentral,
          disposicionFinal: item.disposicionFinal
        });
        await serieDoc.save();
      }

      let subseriesImportadas = 0;
      if (incluirSubseries) {
        const subBanter = await BanterMaster.find({ nivel: 'SUBSERIE', seriePadreCodigo: item.codigo });
        for (const sub of subBanter) {
          const existeSub = await SubserieDocumental.findOne({ serieId: serieDoc._id, codigoSubserie: sub.codigo });
          if (!existeSub) {
            const nuevaSub = new SubserieDocumental({
              serieId: serieDoc._id,
              codigoSubserie: sub.codigo,
              nombreSubserie: sub.nombre,
              tiempoRetencionGestion: sub.retencionGestion,
              tiempoRetencionCentral: sub.retencionCentral,
              disposicionFinal: sub.disposicionFinal
            });
            await nuevaSub.save();
            subseriesImportadas++;
          }
        }
      }

      await registrarAuditoria({
        empresaId,
        usuarioId: req.user.id,
        accion: 'IMPORTAR_SERIE_BANTER',
        detalles: { codigo: item.codigo, nombre: item.nombre, subseriesCount: subseriesImportadas }
      });

      return res.json(jsonResponse(200, { 
        message: `Serie ${item.codigo} importada con éxito. ${subseriesImportadas} subseries añadidas.`,
        serie: serieDoc 
      }));
    } 

    if (item.nivel === 'SUBSERIE') {
      const serieBanter = await BanterMaster.findOne({ nivel: 'SERIE', codigo: item.seriePadreCodigo });
      if (!serieBanter) return res.status(404).json(jsonResponse(404, { error: "Serie padre en BANTER no encontrada" }));

      let serieDoc = await SerieDocumental.findOne({ empresaId, codigoSerie: serieBanter.codigo });
      if (!serieDoc) {
        serieDoc = new SerieDocumental({
          empresaId,
          codigoSerie: serieBanter.codigo,
          nombreSerie: serieBanter.nombre,
          origen: 'BANTER',
          tiempoRetencionGestion: serieBanter.retencionGestion,
          tiempoRetencionCentral: serieBanter.retencionCentral,
          disposicionFinal: serieBanter.disposicionFinal
        });
        await serieDoc.save();
      }

      const existeSub = await SubserieDocumental.findOne({ serieId: serieDoc._id, codigoSubserie: item.codigo });
      if (existeSub) return res.status(409).json(jsonResponse(409, { error: "La subserie ya existe en tu CCD" }));

      const nuevaSub = new SubserieDocumental({
        serieId: serieDoc._id,
        codigoSubserie: item.codigo,
        nombreSubserie: item.nombre,
        tiempoRetencionGestion: item.retencionGestion,
        tiempoRetencionCentral: item.retencionCentral,
        disposicionFinal: item.disposicionFinal
      });
      await nuevaSub.save();

      await registrarAuditoria({
        empresaId,
        usuarioId: req.user.id,
        accion: 'IMPORTAR_SUBSERIE_BANTER',
        detalles: { codigo: item.codigo, nombre: item.nombre }
      });

      return res.json(jsonResponse(200, { message: "Subserie importada con éxito", subserie: nuevaSub }));
    }

    res.status(400).json(jsonResponse(400, { error: "Nivel de BANTER no válido" }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al importar desde BANTER" }));
  }
});

// Obtener dependencias - VERSIÓN DEPURACIÓN 2026-05-07-v2
router.get("/dependencias", async (req, res) => {
  console.log("Accediendo a GET /dependencias - Verificación de despliegue activa");
  const empresaId = req.headers["x-empresa-id"];
  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));

  try {
    const dependencias = await Dependencia.find({ empresaId }).sort({ codigoDependencia: 1 });
    res.json(jsonResponse(200, { dependencias }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener dependencias" }));
  }
});

// Crear dependencia
router.post("/dependencias", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigoDependencia, nombreDependencia, dependenciaPadreId, esJuntaDirectiva } = req.body;

  if (!empresaId) return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));

  try {
    const nueva = new Dependencia({
      empresaId,
      codigoDependencia,
      nombreDependencia,
      dependenciaPadreId: dependenciaPadreId || null,
      esJuntaDirectiva
    });
    await nueva.save();
    
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_DEPENDENCIA',
      detalles: { codigo: codigoDependencia, nombre: nombreDependencia }
    });

    res.status(201).json(jsonResponse(201, { dependencia: nueva }));
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json(jsonResponse(400, { error: "Datos de dependencia inválidos (posible ID superior incorrecto)" }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al crear dependencia" }));
  }
});

// Actualizar dependencia
router.put("/dependencias/:id", async (req, res) => {
  const { codigoDependencia, nombreDependencia, dependenciaPadreId, esJuntaDirectiva, estado } = req.body;
  const empresaId = req.headers["x-empresa-id"];
  try {
    const actualizada = await Dependencia.findByIdAndUpdate(
      req.params.id,
      { codigoDependencia, nombreDependencia, dependenciaPadreId: dependenciaPadreId || null, esJuntaDirectiva, estado },
      { new: true }
    );

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_DEPENDENCIA',
      detalles: { id: req.params.id, nombre: nombreDependencia }
    });

    res.json(jsonResponse(200, { dependencia: actualizada }));
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json(jsonResponse(400, { error: "Datos de actualización inválidos" }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar dependencia" }));
  }
});

// Eliminar dependencia
router.delete("/dependencias/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    // Verificar si tiene sub-dependencias
    const tieneHijos = await Dependencia.exists({ dependenciaPadreId: req.params.id });
    if (tieneHijos) {
      return res.status(400).json(jsonResponse(400, { error: "No se puede eliminar una dependencia que tiene sub-dependencias" }));
    }
    
    const dep = await Dependencia.findById(req.params.id);
    await Dependencia.findByIdAndDelete(req.params.id);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_DEPENDENCIA',
      detalles: { id: req.params.id, nombre: dep?.nombreDependencia }
    });

    res.json(jsonResponse(200, { message: "Dependencia eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar dependencia" }));
  }
});

// --- SERIES Y SUBSERIES ---

// Obtener series
router.get("/series", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const series = await SerieDocumental.find({ empresaId }).sort({ codigoSerie: 1 });
    res.json(jsonResponse(200, { series }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener series" }));
  }
});

// Crear serie
router.post("/series", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;

  try {
    const nueva = new SerieDocumental({
      empresaId,
      codigoSerie,
      nombreSerie,
      tiempoRetencionGestion,
      tiempoRetencionCentral,
      disposicionFinal,
      origen: 'manual'
    });
    await nueva.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_SERIE',
      detalles: { codigo: codigoSerie, nombre: nombreSerie }
    });

    res.status(201).json(jsonResponse(201, { serie: nueva }));
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json(jsonResponse(400, { error: "Datos de serie inválidos" }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al crear serie" }));
  }
});

// Actualizar serie
router.put("/series/:id", async (req, res) => {
  const { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;
  const empresaId = req.headers["x-empresa-id"];
  try {
    const actualizada = await SerieDocumental.findByIdAndUpdate(
      req.params.id,
      { codigoSerie, nombreSerie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal },
      { new: true }
    );

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_SERIE',
      detalles: { id: req.params.id, nombre: nombreSerie }
    });

    res.json(jsonResponse(200, { serie: actualizada }));
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json(jsonResponse(400, { error: "Datos de actualización inválidos" }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar serie" }));
  }
});

// Eliminar serie
router.delete("/series/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    // Verificar si tiene subseries
    const tieneSubseries = await SubserieDocumental.exists({ serieId: req.params.id });
    if (tieneSubseries) {
      return res.status(400).json(jsonResponse(400, { error: "No se puede eliminar una serie que tiene subseries" }));
    }

    const serie = await SerieDocumental.findById(req.params.id);
    await SerieDocumental.findByIdAndDelete(req.params.id);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_SERIE',
      detalles: { id: req.params.id, nombre: serie?.nombreSerie }
    });

    res.json(jsonResponse(200, { message: "Serie eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar serie" }));
  }
});

// Obtener subseries de una serie
router.get("/series/:serieId/subseries", async (req, res) => {
  try {
    const subseries = await SubserieDocumental.find({ serieId: req.params.serieId }).sort({ codigoSubserie: 1 });
    res.json(jsonResponse(200, { subseries }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener subseries" }));
  }
});

// Crear subserie
router.post("/subseries", async (req, res) => {
  const { serieId, codigoSubserie, nombreSubserie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;
  const empresaId = req.headers["x-empresa-id"];
  try {
    const nueva = new SubserieDocumental({ 
      serieId, 
      codigoSubserie, 
      nombreSubserie,
      tiempoRetencionGestion,
      tiempoRetencionCentral,
      disposicionFinal
    });
    await nueva.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_SUBSERIE',
      detalles: { codigo: codigoSubserie, nombre: nombreSubserie, serieId }
    });

    res.status(201).json(jsonResponse(201, { subserie: nueva }));
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json(jsonResponse(400, { error: "Datos de subserie inválidos" }));
    }
    res.status(500).json(jsonResponse(500, { error: "Error al crear subserie" }));
  }
});

// Actualizar subserie
router.put("/subseries/:id", async (req, res) => {
  const { codigoSubserie, nombreSubserie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal } = req.body;
  const empresaId = req.headers["x-empresa-id"];
  try {
    const actualizada = await SubserieDocumental.findByIdAndUpdate(
      req.params.id,
      { codigoSubserie, nombreSubserie, tiempoRetencionGestion, tiempoRetencionCentral, disposicionFinal },
      { new: true }
    );

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_SUBSERIE',
      detalles: { id: req.params.id, nombre: nombreSubserie }
    });

    res.json(jsonResponse(200, { subserie: actualizada }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar subserie" }));
  }
});

// Eliminar subserie
router.delete("/subseries/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const sub = await SubserieDocumental.findById(req.params.id);
    await SubserieDocumental.findByIdAndDelete(req.params.id);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_SUBSERIE',
      detalles: { id: req.params.id, nombre: sub?.nombreSubserie }
    });

    res.json(jsonResponse(200, { message: "Subserie eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar subserie" }));
  }
});

// Importar catálogo BANTER
router.post("/importar-banter", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  
  const seriesBanter = [
    { 
      codigo: '01', 
      nombre: 'ACCIONES CONSTITUCIONALES',
      subseries: [
        { codigo: '01', nombre: 'Acciones de Cumplimiento' },
        { codigo: '02', nombre: 'Acciones de Grupo' },
        { codigo: '03', nombre: 'Acciones Populares' },
        { codigo: '04', nombre: 'Acciones de Tutela' },
      ]
    },
    { 
      codigo: '02', 
      nombre: 'ACTAS',
      subseries: [
        { codigo: '01', nombre: 'Actas de Comité Directivo' },
        { codigo: '02', nombre: 'Actas de Comité de Contratación' },
      ]
    },
    { 
      codigo: '03', 
      nombre: 'ACTOS ADMINISTRATIVOS',
      subseries: [
        { codigo: '01', nombre: 'Resoluciones' },
        { codigo: '02', nombre: 'Circulares' },
      ]
    },
    {
      codigo: '04',
      nombre: 'CONTRATOS',
      subseries: [
        { codigo: '01', nombre: 'Contratos de Obra' },
        { codigo: '02', nombre: 'Contratos de Prestación de Servicios' },
        { codigo: '03', nombre: 'Contratos de Suministro' },
      ]
    }
  ];

  try {
    for (const ser of seriesBanter) {
      let serieDoc = await SerieDocumental.findOne({ empresaId, codigoSerie: ser.codigo });
      
      if (!serieDoc) {
        serieDoc = new SerieDocumental({
          empresaId,
          codigoSerie: ser.codigo,
          nombreSerie: ser.nombre,
          origen: 'BANTER',
          tiempoRetencionGestion: 2,
          tiempoRetencionCentral: 8,
          disposicionFinal: 'Conservación Total'
        });
        await serieDoc.save();
      }

      for (const sub of ser.subseries) {
        const existeSub = await SubserieDocumental.exists({ serieId: serieDoc._id, codigoSubserie: sub.codigo });
        if (!existeSub) {
          const nuevaSub = new SubserieDocumental({
            serieId: serieDoc._id,
            codigoSubserie: sub.codigo,
            nombreSubserie: sub.nombre
          });
          await nuevaSub.save();
        }
      }
    }

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'IMPORTAR_BANTER',
      detalles: { count: seriesBanter.length }
    });

    res.json(jsonResponse(200, { message: "Catálogo BANTER importado con éxito" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al importar catálogo BANTER" }));
  }
});

// --- TRD ---

// Configurar TRD (vincular dependencia con subserie)
router.post("/trd", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { dependenciaId, subserieId } = req.body;

  try {
    const dep = await Dependencia.findOne({ _id: dependenciaId, empresaId });
    const sub = await SubserieDocumental.findById(subserieId).populate('serieId');
    
    if (!dep || !sub) {
      return res.status(404).json(jsonResponse(404, { error: "Dependencia o Subserie no encontrada en el contexto de tu empresa." }));
    }

    if (sub.serieId.empresaId.toString() !== empresaId) {
      return res.status(403).json(jsonResponse(403, { error: "La serie documental no pertenece a tu empresa." }));
    }

    const codigoTRD = `${dep.codigoDependencia}-${sub.serieId.codigoSerie}-${sub.codigoSubserie}`;

    const nuevaTRD = new TRD({
      empresaId,
      dependenciaId,
      subserieId,
      codigoTRD
    });
    await nuevaTRD.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'VINCULAR_TRD',
      detalles: { codigo: codigoTRD, dependencia: dep.nombreDependencia, subserie: sub.nombreSubserie }
    });

    res.status(201).json(jsonResponse(201, { trd: nuevaTRD }));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json(jsonResponse(400, { error: "Esta combinación de Dependencia y Subserie ya existe en tu TRD." }));
    }
    console.error("Error al crear TRD:", error);
    res.status(500).json(jsonResponse(500, { error: "Error interno al crear la entrada en la TRD" }));
  }
});

// Listar TRD de la empresa
router.get("/trd", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const listado = await TRD.find({ empresaId })
      .populate('dependenciaId')
      .populate({
        path: 'subserieId',
        populate: { path: 'serieId' }
      });
    res.json(jsonResponse(200, { trd: listado }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener TRD" }));
  }
});

// Eliminar entrada de TRD
router.delete("/trd/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const trd = await TRD.findById(req.params.id);
    await TRD.findByIdAndDelete(req.params.id);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_TRD',
      detalles: { id: req.params.id, codigo: trd?.codigoTRD }
    });

    res.json(jsonResponse(200, { message: "Entrada de TRD eliminada" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar TRD" }));
  }
});

module.exports = router;
