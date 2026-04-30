const mongoose = require('mongoose');

const SerieDocumentalSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  codigoSerie: {
    type: String,
    required: true,
    trim: true,
  },
  nombreSerie: {
    type: String,
    required: true,
    trim: true,
  },
  tiempoRetencionGestion: {
    type: Number, // Años en archivo de oficina
  },
  tiempoRetencionCentral: {
    type: Number, // Años en archivo central
  },
  disposicionFinal: {
    type: String,
    enum: ['Conservación Total', 'Eliminación', 'Selección', 'Medio Técnico'],
  },
  origen: {
    type: String,
    enum: ['BANTER', 'manual'],
    default: 'manual',
  },
}, { timestamps: true });

// Índice único compuesto por empresa y código de serie
SerieDocumentalSchema.index({ empresaId: 1, codigoSerie: 1 }, { unique: true });

module.exports = mongoose.model('SerieDocumental', SerieDocumentalSchema);
