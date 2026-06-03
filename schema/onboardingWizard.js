const mongoose = require('mongoose');

const OnboardingWizardSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    unique: true,
  },
  estadoActual: {
    type: String,
    enum: [
      'INICIO',
      'DIAGNOSTICO_MGDA',
      'COMITE_ARCHIVO',
      'POLITICA_DOCUMENTAL',
      'PGD',
      'COMPLETO'
    ],
    default: 'INICIO',
  },
  respuestas: {
    diagnostico: mongoose.Schema.Types.Mixed,
    comite: mongoose.Schema.Types.Mixed,
    politica: mongoose.Schema.Types.Mixed,
    pgd: mongoose.Schema.Types.Mixed,
    fondos: mongoose.Schema.Types.Mixed,
  },
  documentosGenerados: [{
    tipo: String, // ACTA_COMITE, POLITICA, PGD
    documentoId: { type: mongoose.Schema.Types.ObjectId, ref: 'HistorialDocumento' },
    fechaGeneracion: { type: Date, default: Date.now }
  }],
  progreso: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('OnboardingWizard', OnboardingWizardSchema);
