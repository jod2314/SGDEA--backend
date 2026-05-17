const mongoose = require('mongoose');

const ConsecutivoLogSchema = new mongoose.Schema({
  consecutivoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConsecutivoConfig',
    required: true
  },
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  numeroEmitido: {
    type: String, // El valor final formateado (ej: RAD-2025-001)
    required: true
  },
  documentoRefId: {
    type: String, // ID del documento o entidad generada que consumió el número
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  estado: {
    type: String,
    enum: ['ACTIVO', 'ANULADO'],
    default: 'ACTIVO'
  }
}, { timestamps: true });

ConsecutivoLogSchema.index({ consecutivoId: 1, numeroEmitido: 1 }, { unique: true });

module.exports = mongoose.model('ConsecutivoLog', ConsecutivoLogSchema);
