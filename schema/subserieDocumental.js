const mongoose = require('mongoose');

const SubserieDocumentalSchema = new mongoose.Schema({
  serieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SerieDocumental',
    required: true,
  },
  codigoSubserie: {
    type: String,
    required: true,
    trim: true,
  },
  nombreSubserie: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

// Índice único compuesto por serie y código de subserie
SubserieDocumentalSchema.index({ serieId: 1, codigoSubserie: 1 }, { unique: true });

module.exports = mongoose.model('SubserieDocumental', SubserieDocumentalSchema);
