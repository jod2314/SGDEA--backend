const express = require('express');
const router = express.Router();
const tvdService = require('../services/tvdService');
const { jsonResponse } = require('../lib/jsonResponse');
const { validarDDHHObligaCT, registrarRadicadoAGN, registrarConvalidacion, registrarRUSD, calcularAlertasRUSD } = require('../services/tvdConvalidacionService');

// Nota de seguridad: Se invoca registrarAuditoria de forma interna en tvdService para todas las escrituras.


/**
 * @route GET /api/tvd
 * @desc Obtiene todas las Tablas de Valoración Documental (TVD) de la empresa activa.
 */
router.get('/', async (req, res) => {
  const empresaId = req.empresaContext.id;

  try {
    const tvds = await tvdService.obtenerTVDs(empresaId);
    return res.json(jsonResponse(200, { tvds }));
  } catch (error) {
    console.error('Error al obtener las TVDs:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener las Tablas de Valoración Documental (TVD).' }));
  }
});

/**
 * @route GET /api/tvd/alertas-rusd
 * @desc Retorna TVDs convalidadas hace > 30 días hábiles sin código RUSD.
 */
router.get('/alertas-rusd', async (req, res) => {
  try {
    const alertas = await calcularAlertasRUSD(req.empresaContext.id);
    return res.json(jsonResponse(200, { alertas, total: alertas.length }));
  } catch (error) {
    console.error('Error al calcular alertas RUSD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message }));
  }
});

/**
 * @route GET /api/tvd/:tvdId
 * @desc Obtiene el detalle de una TVD por su ID.
 */
router.get('/:tvdId', async (req, res) => {
  const { tvdId } = req.params;
  const empresaId = req.empresaContext.id;

  try {
    const tvd = await tvdService.obtenerTVDPorId(tvdId, empresaId);
    if (!tvd) {
      return res.status(404).json(jsonResponse(404, { error: 'Tabla de Valoración Documental (TVD) no encontrada o no pertenece a la empresa.' }));
    }
    return res.json(jsonResponse(200, { tvd }));
  } catch (error) {
    console.error('Error al obtener detalle de TVD:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener detalle de la Tabla de Valoración Documental (TVD).' }));
  }
});

/**
 * @route POST /api/tvd
 * @desc Crea una nueva TVD en estado borrador (invoca auditoría).
 */
router.post('/', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { version, nombre, descripcion, series } = req.body;

  if (!version || !nombre) {
    return res.status(400).json(jsonResponse(400, { error: 'La versión y el nombre de la TVD son obligatorios.' }));
  }

  try {
    const tvd = await tvdService.crearBorradorTVD(empresaId, { version, nombre, descripcion, series }, usuarioId, req);
    return res.status(201).json(jsonResponse(201, { tvd }));
  } catch (error) {
    console.error('Error al crear TVD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al crear la Tabla de Valoración Documental (TVD).' }));
  }
});

/**
 * @route PUT /api/tvd/:tvdId
 * @desc Actualiza una TVD en estado borrador o en revisión (invoca auditoría).
 */
router.put('/:tvdId', async (req, res) => {
  const { tvdId } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { version, nombre, descripcion, series, estado } = req.body;

  try {
    // Validación normativa DDHH (Ley 594/2000, Art. 57)
    if (series && series.length > 0) {
      const violaciones = validarDDHHObligaCT(series);
      if (violaciones.length > 0) {
        return res.status(422).json(jsonResponse(422, {
          error: 'Violación normativa DDHH — Ley 594/2000, Art. 57',
          violaciones
        }));
      }
    }

    const tvd = await tvdService.actualizarTVD(tvdId, empresaId, { version, nombre, descripcion, series, estado }, usuarioId, req);
    return res.json(jsonResponse(200, { tvd }));
  } catch (error) {
    console.error('Error al actualizar la TVD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al actualizar la Tabla de Valoración Documental (TVD).' }));
  }
});

/**
 * @route POST /api/tvd/:tvdId/aprobar
 * @desc Aprueba una TVD, hace obsoletas las anteriores y sincroniza sus series con SerieDocumental (invoca auditoría).
 */
router.post('/:tvdId/aprobar', async (req, res) => {
  const { tvdId } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { actaAprobacionId } = req.body;

  if (!actaAprobacionId) {
    return res.status(400).json(jsonResponse(400, { error: 'El ID del acta de aprobación del comité es requerido para aprobar la TVD.' }));
  }

  try {
    const tvd = await tvdService.aprobarTVD(tvdId, empresaId, actaAprobacionId, usuarioId, req);
    return res.json(jsonResponse(200, { message: 'Tabla de Valoración Documental (TVD) aprobada y series sincronizadas con éxito.', tvd }));
  } catch (error) {
    console.error('Error al aprobar la TVD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al aprobar la Tabla de Valoración Documental (TVD).' }));
  }
});

/**
 * @route DELETE /api/tvd/:tvdId
 * @desc Elimina una TVD en estado borrador (invoca auditoría).
 */
router.delete('/:tvdId', async (req, res) => {
  const { tvdId } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;

  try {
    const resultado = await tvdService.eliminarTVD(tvdId, empresaId, usuarioId, req);
    return res.json(jsonResponse(200, resultado));
  } catch (error) {
    console.error('Error al eliminar la TVD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al eliminar la Tabla de Valoración Documental (TVD).' }));
  }
});

/**
 * @route PUT /api/tvd/:tvdId/radicar-agn
 * @desc Registra el radicado de la TVD ante el AGN (Acuerdo 004/2019).
 */
router.put('/:tvdId/radicar-agn', async (req, res) => {
  try {
    const tvd = await registrarRadicadoAGN(req.params.tvdId, req.empresaContext.id, req.body, req.user.id, req);
    return res.json(jsonResponse(200, { message: 'Radicado AGN registrado exitosamente.', tvd }));
  } catch (error) {
    console.error('Error al radicar TVD ante AGN:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message }));
  }
});

/**
 * @route PUT /api/tvd/:tvdId/convalidar
 * @desc Registra la convalidación emitida por el AGN o Consejo Territorial.
 */
router.put('/:tvdId/convalidar', async (req, res) => {
  try {
    const tvd = await registrarConvalidacion(req.params.tvdId, req.empresaContext.id, req.body, req.user.id, req);
    return res.json(jsonResponse(200, { message: 'Convalidación registrada exitosamente.', tvd }));
  } catch (error) {
    console.error('Error al registrar convalidación:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message }));
  }
});

/**
 * @route PUT /api/tvd/:tvdId/registrar-rusd
 * @desc Registra el código RUSD (plazo: 30 días hábiles desde convalidación).
 */
router.put('/:tvdId/registrar-rusd', async (req, res) => {
  try {
    const tvd = await registrarRUSD(req.params.tvdId, req.empresaContext.id, req.body, req.user.id, req);
    return res.json(jsonResponse(200, { message: 'Registro RUSD exitoso.', tvd }));
  } catch (error) {
    console.error('Error al registrar RUSD:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message }));
  }
});

module.exports = router;
