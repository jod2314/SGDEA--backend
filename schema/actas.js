const mongoose = require('mongoose');

const ActasSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  tipoActa: {
    type: String,
    enum: ['CONFORMACION_COMITE', 'APROBACION_TVD'],
    required: true
  },
  urlPdf: {
    type: String,
    required: true
  },
  fechaCargue: {
    type: Date,
    default: Date.now
  },
  estado: {
    type: String,
    default: 'ACTIVO'
  }
}, { timestamps: true });

module.exports = mongoose.model('Actas', ActasSchema);
