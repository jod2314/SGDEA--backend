const AuditLog = require('../schema/auditLog');

/**
 * Registra una acción en el log de auditoría.
 * @param {Object} data - Datos de la auditoría.
 * @param {string} data.empresaId - ID de la empresa.
 * @param {string} data.usuarioId - ID del usuario que realiza la acción.
 * @param {string} data.accion - Descripción breve de la acción (ej: 'CREAR_DEPENDENCIA').
 * @param {Object} data.detalles - Objeto con información adicional relevante.
 */
async function registrarAuditoria({ empresaId, usuarioId, accion, detalles }) {
  try {
    const log = new AuditLog({
      empresa: empresaId,
      usuario: usuarioId,
      accion,
      detalles,
      fecha: new Date()
    });
    await log.save();
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
    // No lanzamos el error para no bloquear la operación principal si falla el log
  }
}

module.exports = { registrarAuditoria };
