const express = require('express');
const router = express.Router();
const comiteService = require('../services/comiteService');
const { jsonResponse } = require('../lib/jsonResponse');

// Nota de seguridad: Se invoca registrarAuditoria de forma interna en comiteService para todas las escrituras.


/**
 * @route GET /api/comites
 * @desc Obtiene todos los comités de archivo de la empresa activa.
 */
router.get('/', async (req, res) => {
  const empresaId = req.empresaContext.id;

  try {
    const comites = await comiteService.obtenerComites(empresaId);
    return res.json(jsonResponse(200, { comites }));
  } catch (error) {
    console.error('Error al obtener comités:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener comités de archivo.' }));
  }
});

/**
 * @route GET /api/comites/actas
 * @desc Obtiene todas las actas de comité de la empresa activa.
 */
router.get('/actas', async (req, res) => {
  const empresaId = req.empresaContext.id;

  try {
    const actas = await comiteService.obtenerActasPorEmpresa(empresaId);
    return res.json(jsonResponse(200, { actas }));
  } catch (error) {
    console.error('Error al obtener actas por empresa:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener actas de comité.' }));
  }
});

/**
 * @route GET /api/comites/actas/:actaId
 * @desc Obtiene el detalle de un acta de comité específica.
 */
router.get('/actas/:actaId', async (req, res) => {
  const { actaId } = req.params;
  const empresaId = req.empresaContext.id;

  try {
    const acta = await comiteService.obtenerActaPorId(actaId, empresaId);
    if (!acta) {
      return res.status(404).json(jsonResponse(404, { error: 'Acta de comité no encontrada o no pertenece a la empresa.' }));
    }
    return res.json(jsonResponse(200, { acta }));
  } catch (error) {
    console.error('Error al obtener detalle del acta:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener detalle de la acta de comité.' }));
  }
});

/**
 * @route GET /api/comites/:id
 * @desc Obtiene un comité de archivo por su ID.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const empresaId = req.empresaContext.id;

  try {
    const comite = await comiteService.obtenerComitePorId(id, empresaId);
    if (!comite) {
      return res.status(404).json(jsonResponse(404, { error: 'Comité de archivo no encontrado o no pertenece a la empresa.' }));
    }
    return res.json(jsonResponse(200, { comite }));
  } catch (error) {
    console.error('Error al obtener comité por id:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener el comité de archivo.' }));
  }
});

/**
 * @route GET /api/comites/:id/actas
 * @desc Obtiene las actas de un comité de archivo específico.
 */
router.get('/:id/actas', async (req, res) => {
  const { id } = req.params;
  const empresaId = req.empresaContext.id;

  try {
    const actas = await comiteService.obtenerActasComite(id, empresaId);
    return res.json(jsonResponse(200, { actas }));
  } catch (error) {
    console.error('Error al obtener actas de comité:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener las actas del comité.' }));
  }
});

/**
 * @route POST /api/comites
 * @desc Crea un nuevo comité de archivo (invoca auditoría).
 */
router.post('/', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { nombre, descripcion, miembros } = req.body;

  if (!nombre) {
    return res.status(400).json(jsonResponse(400, { error: 'El nombre del comité es obligatorio.' }));
  }

  try {
    const comite = await comiteService.crearComite(empresaId, { nombre, descripcion, miembros }, usuarioId, req);
    return res.status(201).json(jsonResponse(201, { comite }));
  } catch (error) {
    console.error('Error al crear comité:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al crear el comité de archivo.' }));
  }
});

/**
 * @route PUT /api/comites/:id
 * @desc Actualiza un comité de archivo (invoca auditoría).
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { nombre, descripcion, miembros, estado } = req.body;

  try {
    const comite = await comiteService.actualizarComite(id, empresaId, { nombre, descripcion, miembros, estado }, usuarioId, req);
    return res.json(jsonResponse(200, { comite }));
  } catch (error) {
    console.error('Error al actualizar comité:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al actualizar el comité de archivo.' }));
  }
});

/**
 * @route POST /api/comites/actas
 * @desc Crea un acta para un comité específico (invoca auditoría).
 */
router.post('/actas', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { comiteId, numeroActa, fechaReunion, temasTratados, desarrollo, compromisos } = req.body;

  if (!comiteId || !numeroActa || !fechaReunion || !desarrollo) {
    return res.status(400).json(jsonResponse(400, { error: 'Los campos comiteId, numeroActa, fechaReunion y desarrollo son obligatorios.' }));
  }

  try {
    const acta = await comiteService.crearActaComite(
      empresaId,
      { comiteId, numeroActa, fechaReunion, temasTratados, desarrollo, compromisos },
      usuarioId,
      req
    );
    return res.status(201).json(jsonResponse(201, { acta }));
  } catch (error) {
    console.error('Error al crear acta de comité:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al crear el acta de comité.' }));
  }
});

/**
 * @route PUT /api/comites/actas/:actaId
 * @desc Actualiza un acta en estado borrador (invoca auditoría).
 */
router.put('/actas/:actaId', async (req, res) => {
  const { actaId } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { numeroActa, fechaReunion, temasTratados, desarrollo, compromisos } = req.body;

  try {
    const acta = await comiteService.actualizarActaComite(
      actaId,
      empresaId,
      { numeroActa, fechaReunion, temasTratados, desarrollo, compromisos },
      usuarioId,
      req
    );
    return res.json(jsonResponse(200, { acta }));
  } catch (error) {
    console.error('Error al actualizar acta de comité:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al actualizar el acta de comité.' }));
  }
});

/**
 * @route POST /api/comites/actas/:actaId/oficializar
 * @desc Oficializa un acta, genera su PDF inmutable y lo retorna como buffer (invoca auditoría).
 */
router.post('/actas/:actaId/oficializar', async (req, res) => {
  const { actaId } = req.params;
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;

  try {
    const { buffer, acta } = await comiteService.oficializarActaComite(actaId, empresaId, usuarioId, req);

    // Responder enviando el buffer de PDF directamente con las cabeceras correspondientes
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="acta-${acta.numeroActa}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error al oficializar acta de comité:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al oficializar el acta de comité.' }));
  }
});

module.exports = router;
