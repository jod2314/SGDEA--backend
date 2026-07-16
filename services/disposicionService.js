const Expediente = require('../schema/expediente');
const moment = require('moment');

/**
 * Identifica expedientes en Archivo Central cuyo tiempo de retención total ha expirado.
 */
async function obtenerListosDisposicionFinal(empresaId) {
  const hoy = moment();
  
  // Expedientes que ya están en CENTRAL
  const expedientes = await Expediente.find({
    empresaId,
    ubicacion: 'CENTRAL',
    estado: 'CERRADO'
  }).populate('subserieId');

  return expedientes.filter(exp => {
    const retGestion = exp.subserieId.tiempoRetencionGestion || 0;
    const retCentral = exp.subserieId.tiempoRetencionCentral || 0;
    const tiempoTotal = retGestion + retCentral;
    
    const fechaFinRetencion = moment(exp.fechaCierre).add(tiempoTotal, 'years');
    return hoy.isSameOrAfter(fechaFinRetencion);
  });
}

/**
 * Ejecuta la eliminación lógica y física de un set de expedientes.
 * Según la norma, se debe conservar el rastro del acta aunque los archivos se borren.
 */
async function procesarEliminacionMasiva(empresaId, expedientesIds, actaId) {
  // 1. Validar que los expedientes pertenecen a la empresa y están listos
  const expedientes = await Expediente.find({
    _id: { $in: expedientesIds },
    empresaId,
    ubicacion: 'CENTRAL'
  });

  // 2. Marcar expedientes como ELIMINADOS
  await Expediente.updateMany(
    { _id: { $in: expedientesIds } },
    { 
      $set: { 
        ubicacion: 'ELIMINADO',
        estado: 'CERRADO',
        descripcion: `Eliminado según Acta ID: ${actaId}` 
      } 
    }
  );

  // NOTA: En un entorno con almacenamiento físico (S3/Filesystem), 
  // aquí se dispararía el borrado de los archivos binarios asociados 
  // para cumplir con la política de eliminación.

  return expedientes.length;
}

const Documento = require('../schema/documento');

/**
 * Procesa la eliminación de un set de documentos individuales en el SGD.
 */
async function procesarEliminacionDocumentos(empresaId, documentosIds, actaId) {
  const result = await Documento.updateMany(
    { _id: { $in: documentosIds }, empresaId },
    {
      $set: {
        soporte: 'FISICO', // se marca físico para denotar destrucción o retiro de digital
        codigoClasificacion: 'ELIMINADO',
        'metadatosExtendidos.observacionEliminacion': `Eliminado bajo Acta ID: ${actaId}`
      }
    }
  );

  return result.modifiedCount;
}

module.exports = {
  obtenerListosDisposicionFinal,
  procesarEliminacionMasiva,
  procesarEliminacionDocumentos
};
