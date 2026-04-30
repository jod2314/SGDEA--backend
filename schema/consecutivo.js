const mongoose = require('mongoose');

const ConsecutivoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  key: {
    type: String, // Ej: "1100-02-01-2026" (Dep-Ser-Sub-Año)
    required: true,
  },
  valor: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

ConsecutivoSchema.index({ empresaId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Consecutivo', ConsecutivoSchema);
