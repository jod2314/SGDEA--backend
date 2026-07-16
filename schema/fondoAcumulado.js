const mongoose = require('mongoose');

const FondoAcumuladoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  codigoInventario: {
    type: String,
    required: true,
    trim: true,
  },
  seccion: {
    type: String,
    required: true,
    trim: true,
  },
  seccionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dependencia',
    default: null,
  },
  subseccion: {
    type: String,
    trim: true,
  },
  subseccionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dependencia',
    default: null,
  },
  asunto: {
    type: String,
    required: true,
    trim: true,
  },
  fechasExtremas: {
    inicial: { type: Date },
    final: { type: Date }
  },
  soporte: {
    type: String,
    enum: ['FISICO', 'DIGITAL', 'AMBOS'],
    default: 'FISICO',
  },
  volumen: {
    cajas: { type: Number, default: 0 },
    carpetas: { type: Number, default: 0 },
    folios: { type: Number, default: 0 }
  },
  estadoConservacion: {
    type: String,
    enum: ['BUENO', 'REGULAR', 'MALO'],
    default: 'BUENO',
  }
}, { timestamps: true });

FondoAcumuladoSchema.index({ empresaId: 1, codigoInventario: 1 });

module.exports = mongoose.model('FondoAcumulado', FondoAcumuladoSchema);
