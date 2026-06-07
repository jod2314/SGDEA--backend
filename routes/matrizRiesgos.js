const express = require('express');
const router = express.Router();
const matrizRiesgosService = require('../services/matrizRiesgosService');
const { jsonResponse } = require('../lib/jsonResponse');

// Nota de seguridad: Se invoca registrarAuditoria de forma interna en matrizRiesgosService para todas las escrituras.


/**
 * @route GET /api/matriz-riesgos
 * @desc Obtiene la Matriz de Riesgos del depósito de archivo físico para la empresa activa.
 */
router.get('/', async (req, res) => {
  const empresaId = req.empresaContext.id;

  try {
    const matriz = await matrizRiesgosService.obtenerMatrizRiesgos(empresaId);
    if (!matriz) {
      // Si no existe, podemos retornar un objeto vacío con 200 para que el front lo pinte vacío
      return res.json(jsonResponse(200, { matriz: null }));
    }
    return res.json(jsonResponse(200, { matriz }));
  } catch (error) {
    console.error('Error al obtener la matriz de riesgos:', error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener la matriz de riesgos del depósito.' }));
  }
});

/**
 * @route POST /api/matriz-riesgos
 * @desc Crea o actualiza (upsert) la Matriz de Riesgos del depósito de archivo físico para la empresa activa.
 */
router.post('/', async (req, res) => {
  const empresaId = req.empresaContext.id;
  const usuarioId = req.user.id;
  const { nombre, descripcion, riesgos } = req.body;

  try {
    const matriz = await matrizRiesgosService.guardarMatrizRiesgos(
      empresaId,
      { nombre, descripcion, riesgos },
      usuarioId,
      req
    );
    return res.json(jsonResponse(200, { message: 'Matriz de riesgos guardada correctamente.', matriz }));
  } catch (error) {
    console.error('Error al guardar la matriz de riesgos:', error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al guardar la matriz de riesgos del depósito.' }));
  }
});

module.exports = router;
