const mongoose = require('mongoose');

const EntidadSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['NATURAL', 'JURIDICA'],
    required: true,
  },
  numeroIdentificacion: {
    type: String,
    required: true,
    trim: true,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  apellidos: {
    type: String,
    trim: true,
  },
  razonSocial: {
    type: String,
    trim: true,
  },
  direccion: {
    type: String,
    trim: true,
  },
  telefono: {
    type: String,
    trim: true,
  },
  correo: {
    type: String,
    trim: true,
  },
  ciudad: {
    type: String,
    trim: true,
  },
  departamento: {
    type: String,
    trim: true,
  },
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  activa: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Unicidad de identificación por empresa
EntidadSchema.index({ numeroIdentificacion: 1, empresaId: 1 }, { unique: true });

module.exports = mongoose.model('Entidad', EntidadSchema);
