const HistorialDocumento = require('../schema/historialDocumento');
const Expediente = require('../schema/expediente');
const AuditLog = require('../schema/auditLog');
const OnboardingWizard = require('../schema/onboardingWizard');
const mongoose = require('mongoose');

/**
 * Obtiene métricas consolidadas de producción documental por serie.
 */
async function obtenerEstadisticasProduccion(empresaId) {
  return await HistorialDocumento.aggregate([
    { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
    { $group: { 
        _id: "$codigoTRD", 
        count: { $sum: 1 },
        tipoArchivo: { $first: "$tipoArchivo" }
    } },
    { $sort: { count: -1 } }
  ]);
}

/**
 * Obtiene el estado del inventario de expedientes (Abiertos, Cerrados, Ubicación).
 */
async function obtenerEstadoInventario(empresaId) {
  return await Expediente.aggregate([
    { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
    { $group: { 
        _id: { estado: "$estado", ubicacion: "$ubicacion" }, 
        count: { $sum: 1 } 
    } }
  ]);
}

/**
 * Obtiene la actividad de auditoría de los últimos 7 días.
 */
async function obtenerActividadAuditoria(empresaId) {
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);

  return await AuditLog.aggregate([
    { $match: { 
        empresa: new mongoose.Types.ObjectId(empresaId),
        fecha: { $gte: hace7Dias }
    } },
    { $group: { 
        _id: { 
            dia: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
            accion: "$accion"
        }, 
        count: { $sum: 1 } 
    } },
    { $sort: { "_id.dia": 1 } }
  ]);
}

/**
 * Calcula el índice de madurez archivística basado en el onboarding.
 */
async function obtenerIndiceMadurez(empresaId) {
  const wizard = await OnboardingWizard.findOne({ empresaId });
  return {
    porcentajeCompletitud: wizard ? wizard.progreso : 0,
    faseActual: wizard ? wizard.estadoActual : 'SIN_INICIAR'
  };
}

module.exports = {
  obtenerEstadisticasProduccion,
  obtenerEstadoInventario,
  obtenerActividadAuditoria,
  obtenerIndiceMadurez
};
