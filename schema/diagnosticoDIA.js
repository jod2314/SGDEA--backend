const mongoose = require('mongoose');

/**
 * Esquema para el Diagnóstico Integral de Archivos (DIA)
 * Basado en el Acuerdo 002 de 2004 del AGN y Fichas H-1 a H-14
 */
const DiagnosticoDIASchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  // Población Total (N) y Muestra Calculada (n)
  poblacionTotalCarpetas: {
    type: Number,
    required: true,
    default: 0
  },
  margenError: {
    type: Number,
    default: 0.08 // 8% por defecto
  },
  nivelConfianza: {
    type: Number,
    default: 1.96 // 95% de confianza (Z)
  },
  muestraCalculada: {
    type: Number,
    default: 0
  },
  // Bloque 1: Medición Volumétrica (m.l. y GB)
  medicionVolumetrica: {
    metrosLinealesPapel: { type: Number, default: 0 },
    almacenamientoDigitalGB: { type: Number, default: 0 },
    estanteriasCantidad: { type: Number, default: 0 },
    estanteriasSaturacionPorcentaje: { type: Number, default: 0 }
  },
  // Bloque 2: Fichas Cualitativas PGD (H-4 a H-11)
  fichasPGD: {
    type: Map,
    of: {
      cumple: Boolean,
      observaciones: String
    },
    default: {}
  },
  // Bloque 3: Muestreo de Conservación (H-12 Físico & H-13 Electrónico)
  indicadoresSIC: {
    porcentajeOxidacionTintas: { type: Number, default: 0 },
    porcentajeDeterioroBiologico: { type: Number, default: 0 },
    porcentajeDeformacionFisica: { type: Number, default: 0 }
  },
  // Bloque 4: Lecturas Ambientales (H-14)
  lecturasAmbientales: {
    temperaturaPromedio: { type: Number, default: 0 },
    humedadRelativaPromedio: { type: Number, default: 0 },
    iluminacionLuxes: { type: Number, default: 0 },
    presenciaPlagasActivas: { type: Boolean, default: false }
  },
  // Matriz DOFA
  dofa: {
    debilidades: [String],
    oportunidades: [String],
    fortalezas: [String],
    amenazas: [String]
  },
  estado: {
    type: String,
    enum: ['BORRADOR', 'EN_EVALUACION', 'FINALIZADO'],
    default: 'BORRADOR'
  }
}, { timestamps: true });

DiagnosticoDIASchema.index({ empresaId: 1 });

module.exports = mongoose.model('DiagnosticoDIA', DiagnosticoDIASchema);
