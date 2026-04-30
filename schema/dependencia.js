const mongoose = require('mongoose');

const DependenciaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  codigoDependencia: {
    type: String,
    required: true,
    trim: true,
  },
  nombreDependencia: {
    type: String,
    required: true,
    trim: true,
  },
  dependenciaPadreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dependencia',
    default: null,
  },
  esJuntaDirectiva: {
    type: Boolean,
    default: false,
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo',
  },
}, { timestamps: true });

// Índice único compuesto por empresa y código de dependencia
DependenciaSchema.index({ empresaId: 1, codigoDependencia: 1 }, { unique: true });

module.exports = mongoose.model('Dependencia', DependenciaSchema);
