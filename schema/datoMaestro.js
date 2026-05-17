const mongoose = require('mongoose');

const DatoMaestroSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  tipo: {
    type: String, // Ej: "REPRESENTANTE_LEGAL", "DATOS_CONTACTO", "MEMBRETE"
    required: true,
    uppercase: true,
    trim: true,
  },
  datos: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  vigenteDesde: {
    type: Date,
    default: Date.now,
  },
  versiones: [{
    datos: mongoose.Schema.Types.Mixed,
    fechaCambio: { type: Date, default: Date.now },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comentario: String,
  }]
}, { timestamps: true });

// Único tipo por empresa
DatoMaestroSchema.index({ empresaId: 1, tipo: 1 }, { unique: true });

module.exports = mongoose.model('DatoMaestro', DatoMaestroSchema);
