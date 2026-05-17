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
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Índice único compuesto por serie y código de subserie
SubserieDocumentalSchema.index({ serieId: 1, codigoSubserie: 1 }, { unique: true });

module.exports = mongoose.model('SubserieDocumental', SubserieDocumentalSchema);
