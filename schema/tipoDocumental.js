const mongoose = require('mongoose');

const TipoDocumentalSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  codigoClasificacionDefault: {
    type: String,
    required: true,
    trim: true,
  },
  gestionAniosDefault: {
    type: Number,
    required: true,
    min: 0,
  },
  centralAniosDefault: {
    type: Number,
    required: true,
    min: 0,
  },
  // JSON Schema de los campos específicos / extendidos de este tipo documental
  jsonSchema: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
}, { timestamps: true });

TipoDocumentalSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('TipoDocumental', TipoDocumentalSchema);
