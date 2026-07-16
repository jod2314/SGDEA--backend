const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

// Metadatos Universales Obligatorios del SGD
const MetadatosUniversalesSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'MetadatosUniversalesSGD',
  type: 'object',
  properties: {
    empresaId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    codigoClasificacion: { type: 'string', pattern: '^[0-9]{4}-[0-9]{4}-[0-9]{3,4}$' },
    fechaCreacion: { type: 'string', format: 'date-time' },
    fechaCierre: { type: 'string', format: 'date-time' },
    responsable: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    nivelAcceso: { type: 'string', enum: ['PUBLICO', 'RESTRINGIDO', 'CONFIDENCIAL'] },
    soporte: { type: 'string', enum: ['FISICO', 'DIGITAL', 'ELECTRONICO'] },
    vigencia: {
      type: 'object',
      properties: {
        gestionAnios: { type: 'integer', minimum: 0 },
        centralAnios: { type: 'integer', minimum: 0 }
      },
      required: ['gestionAnios', 'centralAnios']
    },
    tipoDocumental: { type: 'string' },
    hashIntegridad: { type: 'string', pattern: '^[0-9a-fA-F]{64}$' }
  },
  required: [
    'empresaId',
    'codigoClasificacion',
    'fechaCreacion',
    'responsable',
    'nivelAcceso',
    'soporte',
    'tipoDocumental',
    'hashIntegridad'
  ]
};

const validateUniversal = ajv.compile(MetadatosUniversalesSchema);

/**
 * Valida los metadatos de un documento contra los campos universales del SGD
 * @param {Object} data - Datos del documento a validar
 * @returns {Object} { valido: boolean, errores: Array }
 */
function validarMetadatosUniversales(data) {
  // Asegurar formato de strings y fechas para la validación JSON Schema
  const payload = {
    ...data,
    empresaId: data.empresaId ? data.empresaId.toString() : data.empresaId,
    responsable: data.responsable ? data.responsable.toString() : data.responsable,
    fechaCreacion: data.fechaCreacion instanceof Date ? data.fechaCreacion.toISOString() : data.fechaCreacion,
    fechaCierre: data.fechaCierre instanceof Date ? data.fechaCierre.toISOString() : data.fechaCierre,
  };

  const valido = validateUniversal(payload);
  if (!valido) {
    console.log('PAYLOAD DE VALIDACION FALLIDA:', JSON.stringify(payload, null, 2));
    console.log('ERRORES DE AJV:', validateUniversal.errors);
  }
  return {
    valido,
    errores: !valido ? validateUniversal.errors.map(err => `${err.instancePath} ${err.message}`) : []
  };
}

/**
 * Valida metadatos extendidos contra un JSON Schema dinámico
 * @param {Object} schema - JSON Schema dinámico del tipo documental
 * @param {Object} metadata - Datos extendidos a validar
 * @returns {Object} { valido: boolean, errores: Array }
 */
function validarMetadatosExtendidos(schema, metadata) {
  try {
    const validateExtend = ajv.compile(schema);
    const valido = validateExtend(metadata || {});
    return {
      valido,
      errores: !valido ? validateExtend.errors.map(err => `${err.instancePath} ${err.message}`) : []
    };
  } catch (error) {
    return {
      valido: false,
      errores: [`Error al compilar el esquema dinámico: ${error.message}`]
    };
  }
}

module.exports = {
  validarMetadatosUniversales,
  validarMetadatosExtendidos,
  MetadatosUniversalesSchema
};
