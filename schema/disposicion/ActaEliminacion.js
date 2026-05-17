const mongoose = require('mongoose');

const ActaEliminacionSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  numeroActa: {
    type: String, // Ej: AE-2026-001
    required: true,
  },
  usuarioResponsableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expedientesEliminados: [{
    expedienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expediente' },
    nombreExpediente: String,
    codigoTRD: String,
    fechaApertura: Date,
    fechaCierre: Date,
  }],
  fechaEliminacion: {
    type: Date,
    default: Date.now,
  },
  justificacion: {
    type: String,
    required: true,
  },
  estado: {
    type: String,
    enum: ['BORRADOR', 'APROBADA'],
    default: 'BORRADOR',
  },
  // Metadato de respaldo: se guarda el rastro de lo que se borró físicamente
  resumenMetadatos: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

ActaEliminacionSchema.index({ empresaId: 1, numeroActa: 1 }, { unique: true });

module.exports = mongoose.model('ActaEliminacion', ActaEliminacionSchema);
