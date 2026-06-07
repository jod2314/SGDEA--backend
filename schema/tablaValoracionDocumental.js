const mongoose = require('mongoose');

/**
 * Esquema para Tabla de Valoración Documental (TVD)
 * Listado de series y subseries documentales con sus respectivos tiempos de retención y disposición final,
 * aplicado a fondos documentales acumulados de la organización.
 */
const TablaValoracionDocumentalSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  version: {
    type: String,
    required: true,
    trim: true, // Ej. "1.0", "1.1"
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: {
    type: String,
    trim: true,
  },
  estado: {
    type: String,
    enum: ['borrador', 'en_revision', 'aprobada', 'obsoleta'],
    default: 'borrador',
  },
  actaAprobacionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActaComite',
    default: null,
  },
  series: [{
    codigo: {
      type: String,
      required: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    retencionCentral: {
      type: Number, // Tiempo de retención en años en el Archivo Central
      required: true,
      min: 0,
    },
    disposicionFinal: {
      type: String,
      enum: ['CT', 'E', 'M', 'S'], // CT: Conservación Total, E: Eliminación, M: Microfilmación/Digitalización, S: Selección
      required: true,
    },
    procedimiento: {
      type: String,
      required: true,
      trim: true,
    }
  }],
  usuarioCreadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Índice único por versión para cada empresa
TablaValoracionDocumentalSchema.index({ empresaId: 1, version: 1 }, { unique: true });

// Índice parcial único para asegurar que solo exista una TVD aprobada y activa a la vez por empresa
TablaValoracionDocumentalSchema.index(
  { empresaId: 1, estado: 1 },
  { 
    unique: true, 
    partialFilterExpression: { estado: 'aprobada' } 
  }
);

module.exports = mongoose.model('TablaValoracionDocumental', TablaValoracionDocumentalSchema);
