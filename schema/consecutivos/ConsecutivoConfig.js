const mongoose = require('mongoose');

const ConsecutivoConfigSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  codigo: {
    type: String, // Ej: RAD_INT, RAD_EXT
    required: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String, // Ej: "Radicación Interna"
    required: true,
    trim: true
  },
  mascara: {
    type: String, // Ej: "RAD-{YYYY}-{SEQ}"
    required: true,
  },
  reglaReinicio: {
    type: String,
    enum: ['ANUAL', 'MANUAL', 'CONTINUO'],
    default: 'ANUAL'
  },
  ultimoValor: {
    type: Number,
    default: 0
  },
  ultimaFechaEmision: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// El código del consecutivo debe ser único por empresa
ConsecutivoConfigSchema.index({ empresaId: 1, codigo: 1 }, { unique: true });

module.exports = mongoose.model('ConsecutivoConfig', ConsecutivoConfigSchema);
