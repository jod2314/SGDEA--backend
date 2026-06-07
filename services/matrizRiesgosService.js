const MatrizRiesgosDeposito = require('../schema/matrizRiesgosDeposito');
const { registrarAuditoria } = require('../lib/audit');

/**
 * Obtiene la matriz de riesgos de depósito de una empresa.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerMatrizRiesgos(empresaId) {
  // Retorna la matriz de riesgos de la empresa especificada, poblando los datos del usuario actualizador.
  // Es un filtro estricto por empresaId para garantizar el aislamiento multi-tenant.
  return await MatrizRiesgosDeposito.findOne({ empresaId }).populate('usuarioActualizadorId', 'nombre email');
}

/**
 * Guarda o actualiza la matriz de riesgos de depósito de una empresa (operación atómica / upsert lógico).
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} matrizData - Datos de la matriz a guardar.
 * @param {string} usuarioId - ID del usuario que actualiza.
 * @param {Object} req - Request de Express para el registro de auditoría forense.
 */
async function guardarMatrizRiesgos(empresaId, matrizData, usuarioId, req) {
  let matriz = await MatrizRiesgosDeposito.findOne({ empresaId });

  if (!matriz) {
    // Si no existe, se crea una nueva matriz de riesgos de depósito para la empresa
    matriz = new MatrizRiesgosDeposito({
      empresaId,
      nombre: matrizData.nombre || 'Matriz de Conservación Preventiva del Depósito Principal',
      descripcion: matrizData.descripcion,
      riesgos: matrizData.riesgos || [],
      usuarioActualizadorId: usuarioId
    });
    
    await matriz.save();
    
    // Registrar auditoría obligatoria de creación
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'CREAR_MATRIZ_RIESGOS_DEPOSITO',
      tipoRecurso: 'MATRIZ_RIESGOS',
      recursoId: matriz._id,
      detalles: { nombre: matriz.nombre, riesgosCount: matriz.riesgos.length },
      req
    });
  } else {
    // Si ya existe, se actualizan sus campos correspondientes
    if (matrizData.nombre !== undefined) matriz.nombre = matrizData.nombre;
    if (matrizData.descripcion !== undefined) matriz.descripcion = matrizData.descripcion;
    if (matrizData.riesgos !== undefined) matriz.riesgos = matrizData.riesgos;
    matriz.usuarioActualizadorId = usuarioId;
    
    await matriz.save();
    
    // Registrar auditoría obligatoria de actualización
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'ACTUALIZAR_MATRIZ_RIESGOS_DEPOSITO',
      tipoRecurso: 'MATRIZ_RIESGOS',
      recursoId: matriz._id,
      detalles: { nombre: matriz.nombre, riesgosCount: matriz.riesgos.length },
      req
    });
  }

  return matriz;
}

module.exports = {
  obtenerMatrizRiesgos,
  guardarMatrizRiesgos
};
