const mongoose = require('mongoose');
const TablaValoracionDocumental = require('../schema/tablaValoracionDocumental');
const SerieDocumental = require('../schema/serieDocumental');
const { registrarAuditoria } = require('../lib/audit');

/**
 * Crea un borrador de Tabla de Valoración Documental (TVD).
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} tvdData - Datos de la TVD (version, nombre, descripcion, series).
 * @param {string} usuarioId - ID del usuario creador.
 * @param {Object} req - Request de Express para auditoría.
 */
async function crearBorradorTVD(empresaId, tvdData, usuarioId, req) {
  // Verificar si ya existe una TVD con la misma versión para esta empresa
  const existeVersion = await TablaValoracionDocumental.findOne({ empresaId, version: tvdData.version });
  if (existeVersion) {
    throw new Error(`Ya existe una Tabla de Valoración Documental (TVD) registrada con la versión ${tvdData.version}.`);
  }

  const tvd = new TablaValoracionDocumental({
    empresaId,
    version: tvdData.version,
    nombre: tvdData.nombre,
    descripcion: tvdData.descripcion,
    series: tvdData.series || [],
    estado: 'borrador',
    usuarioCreadorId: usuarioId
  });

  await tvd.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_BORRADOR_TVD',
    tipoRecurso: 'TVD',
    recursoId: tvd._id,
    detalles: { version: tvd.version, nombre: tvd.nombre },
    req
  });

  return tvd;
}

/**
 * Actualiza los datos de una TVD únicamente si se encuentra en estado 'borrador'.
 * @param {string} tvdId - ID de la TVD a actualizar.
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} tvdData - Campos a actualizar.
 * @param {string} usuarioId - ID del usuario que edita.
 * @param {Object} req - Request de Express para auditoría.
 */
async function actualizarTVD(tvdId, empresaId, tvdData, usuarioId, req) {
  const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId });
  if (!tvd) {
    throw new Error('La Tabla de Valoración Documental (TVD) no fue encontrada.');
  }

  if (tvd.estado !== 'borrador' && tvd.estado !== 'en_revision') {
    throw new Error('Únicamente se pueden modificar las TVD en estado borrador o en revisión.');
  }

  if (tvdData.version !== undefined && tvdData.version !== tvd.version) {
    // Validar duplicados de versión
    const existeVersion = await TablaValoracionDocumental.findOne({ 
      empresaId, 
      version: tvdData.version,
      _id: { $ne: tvdId }
    });
    if (existeVersion) {
      throw new Error(`Ya existe otra TVD con la versión ${tvdData.version}.`);
    }
    tvd.version = tvdData.version;
  }

  if (tvdData.nombre !== undefined) tvd.nombre = tvdData.nombre;
  if (tvdData.descripcion !== undefined) tvd.descripcion = tvdData.descripcion;
  if (tvdData.series !== undefined) tvd.series = tvdData.series;
  if (tvdData.estado !== undefined) tvd.estado = tvdData.estado;

  await tvd.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'ACTUALIZAR_TVD',
    tipoRecurso: 'TVD',
    recursoId: tvd._id,
    detalles: { version: tvd.version, nombre: tvd.nombre },
    req
  });

  return tvd;
}

/**
 * Aprueba una TVD marcando la anterior como obsoleta y sincronizando sus series
 * con la colección general 'SerieDocumental' en una transacción de Mongoose.
 * @param {string} tvdId - ID de la TVD a aprobar.
 * @param {string} empresaId - ID de la empresa.
 * @param {string} actaAprobacionId - ID del acta de comité que sustenta la aprobación.
 * @param {string} usuarioId - ID del usuario aprobador.
 * @param {Object} req - Request de Express para auditoría.
 */
async function aprobarTVD(tvdId, empresaId, actaAprobacionId, usuarioId, req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Obtener la TVD que se desea aprobar
    const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId }).session(session);
    if (!tvd) {
      throw new Error('La Tabla de Valoración Documental (TVD) no existe o no pertenece a la empresa.');
    }

    if (tvd.estado === 'aprobada') {
      throw new Error('La Tabla de Valoración Documental (TVD) ya se encuentra aprobada.');
    }

    // 2. Marcar cualquier TVD aprobada previa de la misma empresa como 'obsoleta'
    await TablaValoracionDocumental.updateMany(
      { empresaId, estado: 'aprobada' },
      { $set: { estado: 'obsoleta' } }
    ).session(session);

    // 3. Cambiar estado de la TVD actual a 'aprobada' y asociar el acta de aprobación
    tvd.estado = 'aprobada';
    if (actaAprobacionId) {
      tvd.actaAprobacionId = actaAprobacionId;
    }
    await tvd.save({ session });

    // 4. Sincronizar mediante upsert las series de la TVD con la colección general 'SerieDocumental'
    // Mapeo del enum de disposición final de TVD ['CT', 'E', 'M', 'S'] al de SerieDocumental
    const mapeoDisposicion = {
      'CT': 'Conservación Total',
      'E': 'Eliminación',
      'M': 'Medio Técnico',
      'S': 'Selección'
    };

    for (const serie of tvd.series) {
      const dispFinalMapeada = mapeoDisposicion[serie.disposicionFinal] || 'Conservación Total';

      await SerieDocumental.findOneAndUpdate(
        { empresaId, codigoSerie: serie.codigo },
        {
          $set: {
            nombreSerie: serie.nombre,
            tiempoRetencionCentral: serie.retencionCentral,
            tiempoRetencionGestion: 0, // Al ser valoración documental de fondos acumulados, el ciclo de gestión suele ser nulo o inactivo
            disposicionFinal: dispFinalMapeada,
            origen: 'manual'
          }
        },
        { upsert: true, new: true, session }
      );
    }

    // 5. Confirmar transacción
    await session.commitTransaction();
    session.endSession();

    // 6. Registrar auditoría de aprobación (seguridad y valor probatorio)
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'APROBAR_TVD',
      tipoRecurso: 'TVD',
      recursoId: tvd._id,
      detalles: { version: tvd.version, nombre: tvd.nombre, actaAprobacionId },
      req
    });

    return tvd;

  } catch (error) {
    // Si algo falla, revertimos la transacción
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

/**
 * Obtiene todas las TVDs de una empresa.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerTVDs(empresaId) {
  return await TablaValoracionDocumental.find({ empresaId })
    .populate('actaAprobacionId', 'numeroActa fechaReunion')
    .sort({ createdAt: -1 });
}

/**
 * Obtiene una TVD por su ID y empresa.
 * @param {string} tvdId - ID de la TVD.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerTVDPorId(tvdId, empresaId) {
  return await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId })
    .populate('actaAprobacionId')
    .populate('usuarioCreadorId', 'nombre email');
}

/**
 * Elimina una TVD en estado borrador.
 * @param {string} tvdId - ID de la TVD.
 * @param {string} empresaId - ID de la empresa.
 * @param {string} usuarioId - ID del usuario que elimina.
 * @param {Object} req - Request de Express para auditoría.
 */
async function eliminarTVD(tvdId, empresaId, usuarioId, req) {
  const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId });
  if (!tvd) {
    throw new Error('La Tabla de Valoración Documental (TVD) no fue encontrada.');
  }

  if (tvd.estado !== 'borrador') {
    throw new Error('Únicamente se pueden eliminar Tablas de Valoración Documental (TVD) en estado borrador.');
  }

  const version = tvd.version;
  const nombre = tvd.nombre;

  await TablaValoracionDocumental.deleteOne({ _id: tvdId, empresaId });

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'ELIMINAR_TVD',
    tipoRecurso: 'TVD',
    recursoId: tvdId,
    detalles: { version, nombre },
    req
  });

  return { success: true };
}

module.exports = {
  crearBorradorTVD,
  actualizarTVD,
  aprobarTVD,
  obtenerTVDs,
  obtenerTVDPorId,
  eliminarTVD
};
