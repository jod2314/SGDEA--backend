const mongoose = require('mongoose');
const ConsecutivoConfig = require('../schema/consecutivos/ConsecutivoConfig');
const ConsecutivoLog = require('../schema/consecutivos/ConsecutivoLog');
const { registrarAuditoria } = require('../lib/audit');

function aplicarMascara(mascara, valor) {
  const currentYear = new Date().getFullYear().toString();
  let resultado = mascara.replace(/{YYYY}/g, currentYear);

  const seqMatch = resultado.match(/{SEQ:(\d+)}/);
  if (seqMatch) {
    const padding = parseInt(seqMatch[1], 10);
    const paddedValue = valor.toString().padStart(padding, '0');
    resultado = resultado.replace(seqMatch[0], paddedValue);
  } else {
    resultado = resultado.replace(/{SEQ}/g, valor.toString());
  }

  return resultado;
}

async function emitirRadicadoAtomico(codigo, empresaId, usuarioId, documentoRefId = null) {
  // Iniciar Transacción de MongoDB para garantizar atomicidad estricta
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const configActual = await ConsecutivoConfig.findOne({ codigo, empresaId }).session(session);
    if (!configActual) {
      throw new Error(`Configuración de consecutivo '${codigo}' no encontrada para la empresa.`);
    }

    const hoy = new Date();
    const isNewYear = configActual.reglaReinicio === 'ANUAL' && hoy.getFullYear() > configActual.ultimaFechaEmision.getFullYear();

    let updatedConfig;
    if (isNewYear) {
      updatedConfig = await ConsecutivoConfig.findOneAndUpdate(
        { 
          _id: configActual._id, 
          ultimaFechaEmision: { $lt: new Date(hoy.getFullYear(), 0, 1) } 
        },
        { 
          $set: { ultimoValor: 1, ultimaFechaEmision: hoy } 
        },
        { new: true, session }
      );
    }

    if (!updatedConfig) {
      updatedConfig = await ConsecutivoConfig.findOneAndUpdate(
        { _id: configActual._id },
        { 
          $inc: { ultimoValor: 1 },
          $set: { ultimaFechaEmision: hoy } 
        },
        { new: true, session }
      );
    }

    if (!updatedConfig) {
      throw new Error('Fallo crítico de concurrencia al emitir radicado.');
    }

    const numeroEmitido = aplicarMascara(updatedConfig.mascara, updatedConfig.ultimoValor);

    const logConsecutivo = new ConsecutivoLog({
      consecutivoId: updatedConfig._id,
      empresaId,
      numeroEmitido,
      documentoRefId,
      usuarioId
    });
    await logConsecutivo.save({ session });

    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();

    // Auditoría fuera de la transacción principal para no bloquear el radicado si falla el log secundario
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'EMITIR_RADICADO',
      detalles: { codigoConfig: codigo, numeroEmitido, ref: documentoRefId }
    });

    return numeroEmitido;

  } catch (error) {
    // Revertir cambios en caso de error o condición de carrera
    await session.abortTransaction();
    session.endSession();
    console.error('CRITICAL: Transacción abortada en emisión de radicado', error);
    throw error;
  }
}

module.exports = {
  emitirRadicadoAtomico,
  aplicarMascara
};
