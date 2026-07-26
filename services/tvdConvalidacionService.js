const TablaValoracionDocumental = require('../schema/tablaValoracionDocumental');
const { registrarAuditoria } = require('../lib/audit');

/**
 * Valida que si una serie tiene historicoDDHH=true, la disposicionFinal sea obligatoriamente 'CT'.
 * Regla normativa: Ley 594/2000, Art. 57 — Los documentos de DDHH/DIH no pueden eliminarse.
 */
function validarDDHHObligaCT(series) {
  const violaciones = [];
  for (const serie of series) {
    if (serie.historicoDDHH && serie.disposicionFinal !== 'CT') {
      violaciones.push(
        `La serie '${serie.nombre}' (${serie.codigo}) está marcada como DDHH/Patrimonio. ` +
        `La disposición final DEBE ser Conservación Total (CT), no '${serie.disposicionFinal}'. ` +
        `(Ley 594/2000, Art. 57 — Prohibición absoluta de eliminación).`
      );
    }
  }
  return violaciones;
}

/**
 * Registra el número de radicado ante el AGN.
 */
async function registrarRadicadoAGN(tvdId, empresaId, { numeroRadicado, fechaRadicacion }, usuarioId, req) {
  const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId });
  if (!tvd) throw new Error('TVD no encontrada.');
  if (tvd.estado !== 'aprobada') throw new Error('Solo se puede radicar una TVD previamente aprobada por el Comité.');

  tvd.convalidacion = tvd.convalidacion || {};
  tvd.convalidacion.estadoConvalidacion = 'EN_EVALUACION_AGN';
  tvd.convalidacion.numeroRadicadoAGN = numeroRadicado;
  tvd.convalidacion.fechaRadicacion = fechaRadicacion || new Date();
  await tvd.save();

  await registrarAuditoria({
    empresaId, usuarioId,
    accion: 'RADICAR_TVD_AGN',
    tipoRecurso: 'TVD', recursoId: tvd._id,
    detalles: { numeroRadicado, version: tvd.version },
    req
  });

  return tvd;
}

/**
 * Registra la convalidación emitida por el AGN o Consejo Territorial.
 */
async function registrarConvalidacion(tvdId, empresaId, { conceptoTecnico, fechaConvalidacion }, usuarioId, req) {
  const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId });
  if (!tvd) throw new Error('TVD no encontrada.');

  tvd.convalidacion = tvd.convalidacion || {};
  tvd.convalidacion.estadoConvalidacion = 'CONVALIDADA_AGN';
  tvd.convalidacion.conceptoTecnico = conceptoTecnico;
  tvd.convalidacion.fechaConvalidacion = fechaConvalidacion || new Date();
  await tvd.save();

  await registrarAuditoria({
    empresaId, usuarioId,
    accion: 'CONVALIDAR_TVD_AGN',
    tipoRecurso: 'TVD', recursoId: tvd._id,
    detalles: { version: tvd.version, conceptoTecnico: conceptoTecnico?.substring(0, 200) },
    req
  });

  return tvd;
}

/**
 * Registra el código RUSD (Registro Único de Series Documentales).
 * Plazo obligatorio: 30 días hábiles desde la convalidación (Acuerdo 004/2019).
 */
async function registrarRUSD(tvdId, empresaId, { codigoRUSD, fechaRegistro }, usuarioId, req) {
  const tvd = await TablaValoracionDocumental.findOne({ _id: tvdId, empresaId });
  if (!tvd) throw new Error('TVD no encontrada.');
  if (tvd.convalidacion?.estadoConvalidacion !== 'CONVALIDADA_AGN') {
    throw new Error('Solo se puede registrar en RUSD una TVD previamente convalidada por el AGN.');
  }

  tvd.convalidacion.codigoRUSD = codigoRUSD;
  tvd.convalidacion.fechaRegistroRUSD = fechaRegistro || new Date();
  await tvd.save();

  await registrarAuditoria({
    empresaId, usuarioId,
    accion: 'REGISTRAR_TVD_RUSD',
    tipoRecurso: 'TVD', recursoId: tvd._id,
    detalles: { codigoRUSD, version: tvd.version },
    req
  });

  return tvd;
}

/**
 * Calcula alertas de TVDs convalidadas hace > 30 días hábiles sin código RUSD.
 */
async function calcularAlertasRUSD(empresaId) {
  const treintaDiasAtras = new Date();
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 42); // 42 días naturales ≈ 30 hábiles

  const alertas = await TablaValoracionDocumental.find({
    empresaId,
    'convalidacion.estadoConvalidacion': 'CONVALIDADA_AGN',
    'convalidacion.fechaConvalidacion': { $lte: treintaDiasAtras },
    $or: [
      { 'convalidacion.codigoRUSD': { $exists: false } },
      { 'convalidacion.codigoRUSD': null },
      { 'convalidacion.codigoRUSD': '' }
    ]
  }).select('version nombre convalidacion.fechaConvalidacion');

  return alertas;
}

module.exports = {
  validarDDHHObligaCT,
  registrarRadicadoAGN,
  registrarConvalidacion,
  registrarRUSD,
  calcularAlertasRUSD
};
