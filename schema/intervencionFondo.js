const mongoose = require('mongoose');

/**
 * Esquema que almacena el estado de la intervención física y metodológica 
 * de los fondos documentales acumulados de una empresa.
 */
const intervencionFondoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    unique: true
  },
  faseActual: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
    default: 1
  },
  // Almacena las tareas de la checklist (ej. "1.1": true, "2.1": false, etc.)
  checklist: {
    type: Map,
    of: Boolean,
    default: {}
  },
  // Guarda el estado de contingencias registradas (plagas, datación, etc.)
  contingencias: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Historial de actas y documentos generados en el proceso de intervención
  documentosGenerados: [{
    tipo: {
      type: String,
      required: true
    },
    documentoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HistorialDocumento',
      required: true
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  progreso: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IntervencionFondo', intervencionFondoSchema);
