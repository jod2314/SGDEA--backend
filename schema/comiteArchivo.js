const mongoose = require('mongoose');

/**
 * Esquema para Comité de Archivo (Comité de Desarrollo Administrativo / Comité de Archivo y Valoración Documental)
 * Encargado de aprobar TRD, TVD, políticas de gestión documental y disponer sobre la eliminación o conservación de documentos.
 */
const ComiteArchivoSchema = new mongoose.Schema({
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
  descripcion: {
    type: String,
    trim: true,
  },
  miembros: [{
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cargo: {
      type: String,
      required: true,
      trim: true, // Ej. Jefe de Planeación, Director General, Jefe de Archivo
    },
    rolComite: {
      type: String,
      enum: ['Presidente', 'Secretario Técnico', 'Miembro Vocal', 'Invitado'],
      default: 'Miembro Vocal',
    }
  }],
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo',
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

// Índice único compuesto por empresa y nombre de comité para evitar duplicados en la misma organización
ComiteArchivoSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('ComiteArchivo', ComiteArchivoSchema);
