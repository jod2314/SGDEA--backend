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
  pasoActual: {
    type: Number,
    default: 0,
  },
  respuestas: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  documentosGenerados: [{
    tipo: String, // ACTA_COMITE, POLITICA, PGD
    documentoId: { type: mongoose.Schema.Types.ObjectId, ref: 'HistorialDocumento' },
    fechaGeneracion: { type: Date, default: Date.now }
  }],
  tareasChecklist: [{
    titulo: {
      type: String,
      required: true,
    },
    moduloDestino: {
      type: String,
      default: "",
    },
    completada: {
      type: Boolean,
      default: false,
    }
  }],
  progreso: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('OnboardingWizard', OnboardingWizardSchema);

