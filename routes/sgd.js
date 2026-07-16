const express = require('express');
const router = express.Router();
const Documento = require('../schema/documento');
const TipoDocumental = require('../schema/tipoDocumental');
const { validarMetadatosUniversales, validarMetadatosExtendidos } = require('../services/validationService');
const { jsonResponse } = require('../lib/jsonResponse');
const { registrarAuditoria } = require('../lib/audit');

// 1. Registrar un nuevo Tipo Documental con su JSON Schema
router.post('/tipos-documentales', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const { nombre, codigoClasificacionDefault, gestionAniosDefault, centralAniosDefault, jsonSchema } = req.body;

  try {
    if (!nombre || !codigoClasificacionDefault || gestionAniosDefault === undefined || centralAniosDefault === undefined || !jsonSchema) {
      return res.status(400).json(jsonResponse(400, { error: 'Todos los campos son obligatorios' }));
    }

    // Verificar si ya existe un tipo documental con este nombre para la empresa
    const existe = await TipoDocumental.findOne({ empresaId, nombre });
    if (existe) {
      return res.status(400).json(jsonResponse(400, { error: 'Ya existe un tipo documental con este nombre' }));
    }

    const nuevoTipo = new TipoDocumental({
      empresaId,
      nombre,
      codigoClasificacionDefault,
      gestionAniosDefault,
      centralAniosDefault,
      jsonSchema
    });

    await nuevoTipo.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_TIPO_DOCUMENTAL',
      detalles: { nombre, codigoClasificacionDefault }
    });

    res.status(201).json(jsonResponse(211, { tipoDocumental: nuevoTipo }));
  } catch (error) {
    console.error('ERROR AL CREAR TIPO DOCUMENTAL:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error interno del servidor al crear tipo documental' }));
  }
});

// 2. Listar todos los tipos documentales
router.get('/tipos-documentales', async (req, res) => {
  const empresaId = req.empresaContext.id;
  try {
    const tipos = await TipoDocumental.find({ empresaId });
    res.json(jsonResponse(200, { tipos }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: 'Error al listar tipos documentales' }));
  }
});

// 3. Registrar un documento polimórfico (SGD)
router.post('/documentos', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;

  try {
    const {
      codigoClasificacion,
      fechaCreacion,
      responsable,
      nivelAcceso,
      soporte,
      tipoDocumental,
      hashIntegridad,
      metadatosExtendidos
    } = req.body;

    // Obtener la configuración del tipo documental para traer las vigencias por defecto y el JSON Schema
    const configTipo = await TipoDocumental.findOne({ empresaId, nombre: tipoDocumental });
    if (!configTipo) {
      return res.status(404).json(jsonResponse(404, { error: `Tipo documental '${tipoDocumental}' no configurado en el sistema` }));
    }

    const docData = {
      empresaId,
      codigoClasificacion: codigoClasificacion || configTipo.codigoClasificacionDefault,
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
      responsable: responsable || usuarioId,
      nivelAcceso: nivelAcceso || 'PUBLICO',
      soporte: soporte || 'ELECTRONICO',
      vigencia: {
        gestionAnios: configTipo.gestionAniosDefault,
        centralAnios: configTipo.centralAniosDefault
      },
      tipoDocumental,
      hashIntegridad: hashIntegridad || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // default empty hash
    };

    // Validar Metadatos Universales
    const validacionUniv = validarMetadatosUniversales(docData);
    if (!validacionUniv.valido) {
      return res.status(400).json(jsonResponse(400, { error: 'Fallo en la validación de metadatos universales', detalles: validacionUniv.errores }));
    }

    // Validar Metadatos Extendidos con Ajv/JSON Schema
    const validacionExt = validarMetadatosExtendidos(configTipo.jsonSchema, metadatosExtendidos);
    if (!validacionExt.valido) {
      return res.status(400).json(jsonResponse(400, { error: 'Fallo en la validación del esquema polimórfico', detalles: validacionExt.errores }));
    }

    const nuevoDocumento = new Documento({
      ...docData,
      metadatosExtendidos: metadatosExtendidos || {}
    });

    await nuevoDocumento.save();

    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'REGISTRAR_DOCUMENTO_SGD',
      detalles: {
        documentoId: nuevoDocumento._id,
        tipoDocumental,
        codigoClasificacion: nuevoDocumento.codigoClasificacion
      }
    });

    res.status(201).json(jsonResponse(211, { documento: nuevoDocumento }));
  } catch (error) {
    console.error('ERROR AL REGISTRAR DOCUMENTO:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error al registrar documento en el SGD' }));
  }
});

// 4. Listar y buscar documentos en el SGD con filtros archivísticos
router.get('/documentos', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const { codigoClasificacion, tipoDocumental, buscar, soporte, nivelAcceso } = req.query;

  try {
    const query = { empresaId };

    if (codigoClasificacion) {
      query.codigoClasificacion = codigoClasificacion;
    }
    if (tipoDocumental) {
      query.tipoDocumental = tipoDocumental;
    }
    if (soporte) {
      query.soporte = soporte;
    }
    if (nivelAcceso) {
      query.nivelAcceso = nivelAcceso;
    }

    // Búsqueda por texto básico (LIKE / RegEx)
    if (buscar) {
      query.$or = [
        { codigoClasificacion: { $regex: buscar, $options: 'i' } },
        { tipoDocumental: { $regex: buscar, $options: 'i' } },
        { 'metadatosExtendidos.asunto': { $regex: buscar, $options: 'i' } },
        { 'metadatosExtendidos.seccion': { $regex: buscar, $options: 'i' } }
      ];
    }

    const documentos = await Documento.find(query).sort({ createdAt: -1 });
    res.json(jsonResponse(200, { documentos }));
  } catch (error) {
    console.error('ERROR AL BUSCAR DOCUMENTOS:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error al buscar documentos en el SGD' }));
  }
});

// 5. Obtener detalle de un documento
router.get('/documentos/:id', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const { id } = req.params;

  try {
    const documento = await Documento.findOne({ _id: id, empresaId });
    if (!documento) {
      return res.status(404).json(jsonResponse(404, { error: 'Documento no encontrado' }));
    }
    res.json(jsonResponse(200, { documento }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: 'Error al consultar documento' }));
  }
});

const { obtenerDocumentosListosDisposicion, generarFUIDDocumentos } = require('../services/retencionService');
const { procesarEliminacionDocumentos } = require('../services/disposicionService');

// 6. Obtener documentos listos para disposición final
router.get('/listos-disposicion', async (req, res) => {
  const empresaId = req.empresaContext.id;
  try {
    const documentos = await obtenerDocumentosListosDisposicion(empresaId);
    res.json(jsonResponse(200, { documentos }));
  } catch (error) {
    console.error('ERROR AL OBTENER LISTOS DISPOSICION:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error al procesar el ciclo de retención' }));
  }
});

// 7. Ejecutar eliminación de documentos del SGD
router.post('/eliminar', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const { documentosIds, numeroActa } = req.body;

  try {
    if (!documentosIds || !Array.isArray(documentosIds) || documentosIds.length === 0 || !numeroActa) {
      return res.status(400).json(jsonResponse(400, { error: 'Documentos seleccionados y número de acta obligatorios' }));
    }

    const cantidadModificada = await procesarEliminacionDocumentos(empresaId, documentosIds, numeroActa);

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_DOCUMENTOS_SGD',
      detalles: { cantidad: cantidadModificada, numeroActa }
    });

    res.json(jsonResponse(200, { message: 'Documentos eliminados lógicamente y registrados en acta', cantidad: cantidadModificada }));
  } catch (error) {
    console.error('ERROR AL ELIMINAR DOCUMENTOS:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error al procesar la eliminación' }));
  }
});

// 8. Exportar FUID de los documentos
router.post('/exportar-fuid', async (req, res) => {
  const { documentosIds } = req.body;

  try {
    if (!documentosIds || !Array.isArray(documentosIds) || documentosIds.length === 0) {
      return res.status(400).json(jsonResponse(400, { error: 'Se requiere una lista de IDs de documentos para generar el FUID' }));
    }

    const fuidData = await generarFUIDDocumentos(documentosIds);
    res.json(jsonResponse(200, { fuid: fuidData }));
  } catch (error) {
    console.error('ERROR AL GENERAR FUID:', error);
    res.status(500).json(jsonResponse(500, { error: 'Error al generar el formato FUID' }));
  }
});

module.exports = router;
