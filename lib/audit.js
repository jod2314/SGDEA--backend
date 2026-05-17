const AuditLog = require('../schema/auditLog');

/**
 * Registra una acción en el log de auditoría.
 * @param {Object} data - Datos de la auditoría.
 * @param {string} data.empresaId - ID de la empresa.
 * @param {string} data.usuarioId - ID del usuario que realiza la acción.
 * @param {string} data.accion - Descripción breve de la acción.
 * @param {string} [data.tipoRecurso] - Tipo de objeto (PLANTILLA, EXPEDIENTE, etc).
 * @param {string} [data.recursoId] - ID del objeto afectado.
 * @param {Object} [data.detalles] - Información adicional.
 * @param {Object} [data.req] - Objeto Request de Express para extraer IP y User Agent.
 */
async function registrarAuditoria({ empresaId, usuarioId, accion, tipoRecurso, recursoId, detalles, req }) {
  try {
    const log = new AuditLog({
      empresa: empresaId,
      usuario: usuarioId,
      accion,
      tipoRecurso,
      recursoId,
      detalles,
      ip: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'SISTEMA',
      userAgent: req ? req.headers['user-agent'] : 'SISTEMA',
      fecha: new Date()
    });
    await log.save();
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
}

module.exports = { registrarAuditoria };
