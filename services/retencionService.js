const Expediente = require('../schema/expediente');
const moment = require('moment');

/**
 * Identifica expedientes listos para transferencia primaria (Gestión -> Central).
 * Criterio: Estado CERRADO, Ubicación GESTION, y tiempo de retención cumplido.
 */
async function obtenerListosTransferenciaPrimaria(empresaId) {
  const hoy = moment();
  
  const expedientes = await Expediente.find({
    empresaId,
    estado: 'CERRADO',
    ubicacion: 'GESTION'
  }).populate('subserieId');

  return expedientes.filter(exp => {
    const retencion = exp.subserieId.tiempoRetencionGestion || 0;
    const fechaCumplimiento = moment(exp.fechaCierre).add(retencion, 'years');
    return hoy.isSameOrAfter(fechaCumplimiento);
  });
}

/**
 * Identifica expedientes listos para transferencia secundaria (Central -> Histórico).
 * Criterio: Ubicación CENTRAL, y tiempo de retención en central cumplido.
 */
async function obtenerListosTransferenciaSecundaria(empresaId) {
  const hoy = moment();
  
  const expedientes = await Expediente.find({
    empresaId,
    estado: 'CERRADO',
    ubicacion: 'CENTRAL'
  }).populate('subserieId');

  return expedientes.filter(exp => {
    // La retención secundaria suele contar desde el ingreso a Central o desde el Cierre total.
    // Según AGN, es tiempo en Gestión + tiempo en Central.
    const retGestion = exp.subserieId.tiempoRetencionGestion || 0;
    const retCentral = exp.subserieId.tiempoRetencionCentral || 0;
    const fechaCumplimiento = moment(exp.fechaCierre).add(retGestion + retCentral, 'years');
    return hoy.isSameOrAfter(fechaCumplimiento);
  });
}

/**
 * Genera la estructura de datos para el Formato Único de Inventario Documental (FUID).
 */
async function generarDatosFUID(expedientesIds) {
  const expedientes = await Expediente.find({ _id: { $in: expedientesIds } })
    .populate('dependenciaId')
    .populate('subserieId');

  return expedientes.map((exp, index) => ({
    numeroOrden: index + 1,
    codigo: exp.codigoTRD,
    nombreSerieSubserie: exp.subserieId.nombreSubserie,
    fechasExtremas: {
      inicial: exp.fechaApertura,
      final: exp.fechaCierre || exp.updatedAt
    },
    unidadConservacion: 'Carpeta Electrónica',
    numeroFolios: 'Varios', // Se podría calcular contando registros en HistorialDocumento
    soporte: 'Electrónico',
    frecuenciaConsulta: 'Baja',
    notas: exp.descripcion
  }));
}

const Documento = require('../schema/documento');

/**
 * Identifica documentos individuales en el SGD listos para disposición final.
 * Criterio: fechaCreacion + gestionAnios + centralAnios es menor o igual a hoy.
 */
async function obtenerDocumentosListosDisposicion(empresaId) {
  const hoy = moment();
  const documentos = await Documento.find({ empresaId });

  return documentos.filter(doc => {
    const retencionTotal = (doc.vigencia?.gestionAnios || 0) + (doc.vigencia?.centralAnios || 0);
    const fechaCumplimiento = moment(doc.fechaCreacion).add(retencionTotal, 'years');
    return hoy.isSameOrAfter(fechaCumplimiento);
  });
}

/**
 * Genera el FUID oficial para un grupo de documentos polimórficos individuales.
 */
async function generarFUIDDocumentos(documentosIds) {
  const documentos = await Documento.find({ _id: { $in: documentosIds } });

  return documentos.map((doc, index) => ({
    numeroOrden: index + 1,
    codigo: doc.codigoClasificacion,
    nombreSerieSubserie: doc.tipoDocumental,
    fechasExtremas: {
      inicial: doc.fechaCreacion,
      final: doc.fechaCierre || doc.createdAt
    },
    unidadConservacion: doc.soporte === 'ELECTRONICO' ? 'Archivo Electrónico' : 'Carpeta Física',
    numeroFolios: doc.metadatosExtendidos?.get('numeroFolios') || 1,
    soporte: doc.soporte,
    frecuenciaConsulta: 'Baja',
    notas: `Estado: ${doc.metadatosExtendidos?.get('estadoConservacion') || 'BUENO'}. Hash: ${doc.hashIntegridad.substring(0, 8)}...`
  }));
}

module.exports = {
  obtenerListosTransferenciaPrimaria,
  obtenerListosTransferenciaSecundaria,
  generarDatosFUID,
  obtenerDocumentosListosDisposicion,
  generarFUIDDocumentos
};
