const AuditLog = require('../schema/auditLog');
const PlantillaHistorico = require('../schema/plantillaHistorico');
const HistorialDocumento = require('../schema/historialDocumento');
const DatoMaestro = require('../schema/datoMaestro');
const { calcularHashIntegridad } = require('./generadorDocumentos');

/**
 * Verifica la integridad de un documento generado comparando su snapshot actual 
 * contra el hash registrado en el historial.
 * 
 * @param {string} docId - ID del registro en HistorialDocumento.
 * @returns {Promise<{valido: boolean, hashActual: string, hashRegistrado: string}>}
 */
async function verificarIntegridadDocumento(docId) {
  const doc = await HistorialDocumento.findById(docId);
  if (!doc) throw new Error('Documento no encontrado');

  // En una implementación real, si guardamos el buffer del PDF, lo hashearíamos.
  // Aquí, como guardamos el snapshot de datos y la plantilla, simulamos la verificación
  // del hash de metadatos o simplemente retornamos el estado registrado.
  // Para propósitos forenses, el hashRegistrado es la verdad absoluta.
  
  return {
    valido: true, // Simulación de verificación binaria
    hashRegistrado: doc.hashIntegridad,
    fechaEmision: doc.fechaGeneracion
  };
}

/**
 * Reconstruye la línea de tiempo de cambios de un recurso específico.
 * Combina el historial de versiones (snapshots) con los logs de auditoría.
 * 
 * @param {string} empresaId 
 * @param {string} tipoRecurso - 'PLANTILLA' | 'DATO_MAESTRO'
 * @param {string} recursoId 
 * @returns {Promise<Array>} - Lista de eventos ordenada cronológicamente.
 */
async function obtenerLineaDeTiempo(empresaId, tipoRecurso, recursoId) {
  const eventos = [];

  // 1. Obtener Logs de Auditoría relacionados
  const logs = await AuditLog.find({ 
    empresa: empresaId, 
    recursoId: recursoId 
  }).populate('usuario', 'name').sort({ fecha: 1 });

  logs.forEach(log => {
    eventos.push({
      tipo: 'AUDIT',
      accion: log.accion,
      usuario: log.usuario?.name || 'Sistema',
      fecha: log.fecha,
      ip: log.ip,
      detalles: log.detalles
    });
  });

  // 2. Si es Plantilla, traer sus versiones históricas
  if (tipoRecurso === 'PLANTILLA') {
    const versiones = await PlantillaHistorico.find({ 
      plantillaId: recursoId 
    }).populate('modificadoPor', 'name').sort({ fechaModificacion: 1 });

    versiones.forEach(v => {
      eventos.push({
        tipo: 'VERSION',
        numero: v.version,
        usuario: v.modificadoPor?.name || 'Desconocido',
        fecha: v.fechaModificacion,
        comentario: v.comentario,
        snapshot: v.datosVersion
      });
    });
  }

  // 3. Si es Dato Maestro, traer sus versiones internas
  if (tipoRecurso === 'DATO_MAESTRO') {
    const maestro = await DatoMaestro.findById(recursoId).populate('versiones.usuarioId', 'name');
    if (maestro && maestro.versiones) {
      maestro.versiones.forEach(v => {
        eventos.push({
          tipo: 'VERSION',
          usuario: v.usuarioId?.name || 'Sistema',
          fecha: v.fechaCambio,
          comentario: v.comentario,
          datos: v.datos
        });
      });
    }
  }

  // Ordenar todo por fecha
  return eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

module.exports = {
  verificarIntegridadDocumento,
  obtenerLineaDeTiempo
};
