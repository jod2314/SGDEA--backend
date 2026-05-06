const mongoose = require('mongoose');

const BanterMasterSchema = new mongoose.Schema({
  nivel: {
    type: String,
    enum: ['SERIE', 'SUBSERIE'],
    required: true
  },
  codigo: {
    type: String,
    required: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  definicion: {
    type: String,
    trim: true
  },
  tiposDocumentales: [String],
  retencionGestion: Number,
  retencionCentral: Number,
  disposicionFinal: {
    type: String,
    enum: ['Conservación Total', 'Eliminación', 'Selección', 'Medio Técnico']
  },
  seriePadreCodigo: String, // Solo para SUBSERIES, para saber a qué serie pertenecen en el BANTER
  transversal: {
    type: Boolean,
    default: true // Muchas series de BANTER son transversales (Actas, Contratos)
  }
}, { timestamps: true });

// Índice para búsqueda rápida por nombre o código
BanterMasterSchema.index({ nombre: 'text', codigo: 1 });

module.exports = mongoose.model('BanterMaster', BanterMasterSchema);
