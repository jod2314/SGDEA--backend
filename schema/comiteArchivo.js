const mongoose = require('mongoose');

const ComiteArchivoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  nombre: { type: String, required: true },
  cargo: { type: String, required: true },
  cedula: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ComiteArchivo', ComiteArchivoSchema);
