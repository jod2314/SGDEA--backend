const mongoose = require('mongoose');

/**
 * Esquema para Acta de Comité de Archivo
 * Soporte jurídico e institucional de las decisiones y deliberaciones tomadas por el Comité de Archivo.
 */
const ActaComiteSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  comiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ComiteArchivo',
    required: true,
  },
  numeroActa: {
    type: String,
    required: true,
    trim: true, // Ej. "001-2026", "ACTA-05"
  },
  fechaReunion: {
    type: Date,
    required: true,
  },
  temasTratados: [{
    type: String,
    trim: true,
  }],
  desarrollo: {
    type: String,
    required: true,
  },
  compromisos: [{
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    responsableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    fechaLimite: {
      type: Date,
    }
  }],
  anexo: {
    docRefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HistorialDocumento',
      default: null,
    },
    url: {
      type: String,
      trim: true,
    }
  },
  estado: {
    type: String,
    enum: ['borrador', 'aprobada', 'anulada'],
    default: 'borrador',
  }
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

// Índice compuesto único para evitar duplicados en el número de acta por cada empresa
ActaComiteSchema.index({ empresaId: 1, numeroActa: 1 }, { unique: true });

module.exports = mongoose.model('ActaComite', ActaComiteSchema);
