const mongoose = require('mongoose');

const TransferenciaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tipoTransferencia: {
    type: String,
    enum: ['PRIMARIA', 'SECUNDARIA'],
    required: true,
  },
  expedientes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expediente',
  }],
  estado: {
    type: String,
    enum: ['BORRADOR', 'FINALIZADA'],
    default: 'BORRADOR',
  },
  fechaTransferencia: {
    type: Date,
    default: Date.now,
  },
  observaciones: String,
  numeroActa: String,
}, { timestamps: true });

TransferenciaSchema.index({ empresaId: 1, tipoTransferencia: 1 });

module.exports = mongoose.model('Transferencia', TransferenciaSchema);
