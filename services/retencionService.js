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

module.exports = {
  obtenerListosTransferenciaPrimaria,
  obtenerListosTransferenciaSecundaria,
  generarDatosFUID
};
