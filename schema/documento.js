const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  codigoClasificacion: {
    type: String,
    required: true,
    trim: true,
  },
  fechaCreacion: {
    type: Date,
    required: true,
    default: Date.now,
  },
  fechaCierre: {
    type: Date,
  },
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  nivelAcceso: {
    type: String,
    enum: ['PUBLICO', 'RESTRINGIDO', 'CONFIDENCIAL'],
    required: true,
    default: 'PUBLICO',
  },
  soporte: {
    type: String,
    enum: ['FISICO', 'DIGITAL', 'ELECTRONICO'],
    required: true,
    default: 'ELECTRONICO',
  },
  vigencia: {
    gestionAnios: {
      type: Number,
      required: true,
      min: 0,
    },
    centralAnios: {
      type: Number,
      required: true,
      min: 0,
    }
  },
  tipoDocumental: {
    type: String,
    required: true,
    trim: true,
  },
  hashIntegridad: {
    type: String,
    required: true,
    trim: true,
  },
  // Contenedor dinámico polimórfico EAV / JSONB
  metadatosExtendidos: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  }
}, { timestamps: true });

DocumentoSchema.index({ empresaId: 1, codigoClasificacion: 1 });
DocumentoSchema.index({ empresaId: 1, tipoDocumental: 1 });

module.exports = mongoose.model('Documento', DocumentoSchema);
