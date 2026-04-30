const mongoose = require('mongoose');

const TRDSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  dependenciaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dependencia',
    required: true,
  },
  subserieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubserieDocumental',
    required: true,
  },
  codigoTRD: {
    type: String, // [Cod-Dep]-[Cod-Ser]-[Cod-Sub]
    required: true,
    unique: true,
  },
  estado: {
    type: String,
    enum: ['vigente', 'obsoleto'],
    default: 'vigente',
  },
}, { timestamps: true });

// Índice único compuesto por dependencia y subserie para una empresa
TRDSchema.index({ dependenciaId: 1, subserieId: 1 }, { unique: true });

module.exports = mongoose.model('TablaRetencionDocumental', TRDSchema);
