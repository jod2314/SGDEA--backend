const express = require('express');
const router = express.Router();
const { jsonResponse } = require('../lib/jsonResponse');
const { registrarAuditoria } = require('../lib/audit');
const {
  obtenerEstadoIntervencion,
  actualizarTareaChecklist,
  registrarContingencia,
  generarActaIntervencion
} = require('../services/intervencionFondoService');

// Obtener el estado del asistente de intervención de fondos acumulados
router.get('/estado', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  try {
    const wizard = await obtenerEstadoIntervencion(empresaId);
    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al obtener el estado del asistente de intervención' }));
  }
});

// Marcar/desmarcar una tarea del checklist de intervención
router.post('/tarea', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { tareaId, completado } = req.body;
  if (!tareaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el identificador de la tarea (tareaId)' }));
  }

  try {
    const wizard = await actualizarTareaChecklist(empresaId, tareaId, completado);
    
    // Registrar auditoría forense con req
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_TAREA_CHECKLIST',
      detalles: { tareaId, completado },
      req
    });

    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al actualizar la tarea de la intervención' }));
  }
});

// Registrar contingencias o incidentes (humedad, plagas, datación)
router.post('/contingencia', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { contingenciaId, detalles } = req.body;
  if (!contingenciaId || !detalles) {
    return res.status(400).json(jsonResponse(400, { error: 'Faltan campos requeridos (contingenciaId o detalles)' }));
  }

  try {
    const wizard = await registrarContingencia(empresaId, contingenciaId, detalles);

    // Registrar auditoría con req
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_REGISTRAR_CONTINGENCIA',
      detalles: { contingenciaId },
      req
    });

    return res.json(jsonResponse(200, { wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: 'Error al registrar contingencia de intervención' }));
  }
});

// Generar y oficializar actas de intervención física (Comité, Desinfección, Eliminación)
router.post('/generar-acta', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { tipoActa, datos } = req.body;
  if (!tipoActa || !datos) {
    return res.status(400).json(jsonResponse(400, { error: 'Faltan campos requeridos (tipoActa o datos)' }));
  }

  try {
    const { buffer, docId } = await generarActaIntervencion(empresaId, tipoActa, datos, req.user.id);

    // Registrar auditoría forense
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_GENERAR_ACTA',
      detalles: { tipoActa, docId },
      req
    });

    // Devolver el buffer del PDF/A
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ACTA_${tipoActa}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al generar acta oficial de intervención' }));
  }
});

const Dependencia = require('../schema/dependencia');

// Registrar dependencias históricas del organigrama (Tarea 3.1)
router.post('/registrar-jerarquia', async (req, res) => {
  const empresaId = req.empresaContext && req.empresaContext.id;
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: 'Falta el contexto de Empresa (X-Empresa-ID)' }));
  }

  const { codigoDependencia, nombreDependencia, dependenciaPadreId } = req.body;
  if (!codigoDependencia || !nombreDependencia) {
    return res.status(400).json(jsonResponse(400, { error: 'Código y Nombre de dependencia obligatorios' }));
  }

  try {
    // 1. Crear o actualizar la dependencia oficial en la base de datos
    let dependencia = await Dependencia.findOne({ empresaId, codigoDependencia });
    if (!dependencia) {
      dependencia = new Dependencia({
        empresaId,
        codigoDependencia,
        nombreDependencia,
        dependenciaPadreId: dependenciaPadreId || null,
        estado: 'activo'
      });
      await dependencia.save();
    } else {
      dependencia.nombreDependencia = nombreDependencia;
      dependencia.dependenciaPadreId = dependenciaPadreId || null;
      await dependencia.save();
    }

    // 2. Marcar automáticamente la tarea 3.1 como completada
    const wizard = await actualizarTareaChecklist(empresaId, '3.1', true);

    // 3. Registrar contingencia para persistir los IDs históricos en el asistente
    let dependenciasCreadas = [];
    const contingencias = wizard.contingencias;
    if (contingencias && contingencias.get('apendice_3_1')) {
      const actual = contingencias.get('apendice_3_1');
      dependenciasCreadas = Array.isArray(actual) ? actual : [];
    }
    if (!dependenciasCreadas.includes(dependencia._id.toString())) {
      dependenciasCreadas.push(dependencia._id.toString());
    }
    await registrarContingencia(empresaId, 'apendice_3_1', dependenciasCreadas);

    // 4. Registrar auditoría forense
    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'INTERVENCION_CREAR_JERARQUIA_HISTORICA',
      detalles: { dependenciaId: dependencia._id, codigoDependencia, nombreDependencia },
      req
    });

    return res.json(jsonResponse(200, { message: 'Dependencia histórica registrada y asociada a la intervención', dependencia, wizard }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(jsonResponse(500, { error: error.message || 'Error al registrar la jerarquía del acumulado' }));
  }
});

module.exports = router;
