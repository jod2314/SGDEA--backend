const mongoose = require('mongoose');

/**
 * Esquema de Inventario FUID Físico y Control Topográfico de Cajas X-200 / Carpetas
 */
const InventarioFUIDSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  consecutivo: { type: Number, required: true },
  codigoCajaX200: { type: String, required: true }, // Ej: "CX-2026-001"
  numeroCarpeta: { type: Number, required: true },
  seccionCodigo: { type: String, required: true },
  seccionNombre: { type: String, required: true },
  subseccionCodigo: { type: String },
  subseccionNombre: { type: String },
  serieCodigo: { type: String, required: true },
  serieNombre: { type: String, required: true },
  subserieCodigo: { type: String },
  subserieNombre: { type: String },
  asuntoExpediente: { type: String, required: true },
  fechasExtremas: {
    inicial: { type: Date, required: true },
    final: { type: Date, required: true }
  },
  unidadConservacion: {
    caja: { type: Boolean, default: true },
    carpeta: { type: Boolean, default: true },
    tomo: { type: Boolean, default: false },
    otro: { type: String }
  },
  numeroFolios: { type: Number, required: true, default: 1 },
  soporteFisico: {
    type: String,
    enum: ['PAPEL', 'ELECTRONICO', 'MIXTO'],
    default: 'PAPEL'
  },
  frecuenciaConsulta: {
    type: String,
    enum: ['ALTA', 'MEDIA', 'BAJA'],
    default: 'BAJA'
  },
  ubicacionTopografica: {
    deposito: { type: String, default: 'Depósito 1' },
    estante: { type: String, required: true },
    entrenpanio: { type: String, required: true }
  },
  codigoQRData: { type: String },
  // Operaciones físicas realizadas
  operacionesRealizadas: {
    limpiezaSeco: { type: Boolean, default: false },
    deslegajadoMetal: { type: Boolean, default: false },
    foliacionLapiz: { type: Boolean, default: false },
    encarpetadoNeutro: { type: Boolean, default: false }
  }
}, { timestamps: true });

InventarioFUIDSchema.index({ empresaId: 1, codigoCajaX200: 1 });

module.exports = mongoose.model('InventarioFUID', InventarioFUIDSchema);
