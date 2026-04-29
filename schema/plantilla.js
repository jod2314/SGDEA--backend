const mongoose = require('mongoose');

const PlantillaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: {
    type: String,
    trim: true,
  },
  contenidoHtml: {
    type: String,
    required: true,
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
  versionActual: {
    type: Number,
    default: 1,
  },
}, { timestamps: true });

module.exports = mongoose.model('Plantilla', PlantillaSchema);
