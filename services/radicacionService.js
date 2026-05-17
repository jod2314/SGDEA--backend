const ConsecutivoConfig = require('../schema/consecutivos/ConsecutivoConfig');
const ConsecutivoLog = require('../schema/consecutivos/ConsecutivoLog');
const { registrarAuditoria } = require('../lib/audit');

/**
 * Aplica la máscara al valor secuencial.
 * Reemplaza {YYYY} por el año actual y {SEQ} o {SEQ:n} por el valor rellenado con ceros.
 */
function aplicarMascara(mascara, valor) {
  const currentYear = new Date().getFullYear().toString();
  let resultado = mascara.replace(/{YYYY}/g, currentYear);

  // Buscar si hay {SEQ:n} para aplicar padding
  const seqMatch = resultado.match(/{SEQ:(\d+)}/);
  if (seqMatch) {
    const padding = parseInt(seqMatch[1], 10);
    const paddedValue = valor.toString().padStart(padding, '0');
    resultado = resultado.replace(seqMatch[0], paddedValue);
  } else {
    // Reemplazo simple de {SEQ} sin padding
    resultado = resultado.replace(/{SEQ}/g, valor.toString());
  }

  return resultado;
}

/**
 * Motor atómico para la emisión de números consecutivos/radicados.
 * 
 * @param {string} codigo - Código de la configuración del consecutivo (ej. RAD_INT).
 * @param {string} empresaId - ID de la empresa en contexto.
 * @param {string} usuarioId - ID del usuario solicitante.
 * @param {string} [documentoRefId] - ID del documento asociado (opcional).
 * @returns {Promise<string>} - El número formateado emitido (ej. RAD-2025-0001).
 */
async function emitirRadicadoAtomico(codigo, empresaId, usuarioId, documentoRefId = null) {
  // 1. Obtener la configuración actual para evaluar reglas de reinicio
  const configActual = await ConsecutivoConfig.findOne({ codigo, empresaId });
  if (!configActual) {
    throw new Error(`Configuración de consecutivo '${codigo}' no encontrada para la empresa.`);
  }

  const hoy = new Date();
  const isNewYear = configActual.reglaReinicio === 'ANUAL' && hoy.getFullYear() > configActual.ultimaFechaEmision.getFullYear();

  let updatedConfig;
  if (isNewYear) {
    // Es un nuevo año, intentamos resetear a 1 atómicamente si nadie más lo ha hecho este año
    updatedConfig = await ConsecutivoConfig.findOneAndUpdate(
      { 
        _id: configActual._id, 
        // Asegurar que solo reseteamos si seguimos en el año "viejo" para no sobrescribir a otro proceso
        ultimaFechaEmision: { $lt: new Date(hoy.getFullYear(), 0, 1) } 
      },
      { 
        $set: { ultimoValor: 1, ultimaFechaEmision: hoy } 
      },
      { new: true }
    );
    // Si updatedConfig es null, alguien más ganó la carrera y ya reseteó, pasamos al incremento normal
  }

  if (!updatedConfig) {
    // Incremento normal atómico
    updatedConfig = await ConsecutivoConfig.findOneAndUpdate(
      { _id: configActual._id },
      { 
        $inc: { ultimoValor: 1 },
        $set: { ultimaFechaEmision: hoy } 
      },
      { new: true }
    );
  }

  if (!updatedConfig) {
    throw new Error('Fallo crítico de concurrencia al emitir radicado.');
  }

  // 4. Aplicar máscara de formato
  const numeroEmitido = aplicarMascara(updatedConfig.mascara, updatedConfig.ultimoValor);

  // 5. Registrar en el Log inmutable (Auditoría del consecutivo)
  try {
    const logConsecutivo = new ConsecutivoLog({
      consecutivoId: updatedConfig._id,
      empresaId,
      numeroEmitido,
      documentoRefId,
      usuarioId
    });
    await logConsecutivo.save();
  } catch (error) {
    // Si falla el log por conflicto único, hubo una condición de carrera extrema
    console.error('CRITICAL: Fallo al guardar ConsecutivoLog', error);
    throw new Error('Conflicto de integridad al registrar el radicado.');
  }

  // 6. Registrar en el AuditLog general
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'EMITIR_RADICADO',
    detalles: { codigoConfig: codigo, numeroEmitido, ref: documentoRefId }
  });

  return numeroEmitido;
}

module.exports = {
  emitirRadicadoAtomico,
  aplicarMascara
};
