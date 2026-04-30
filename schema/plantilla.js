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
  subserieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubserieDocumental',
    // required: true, // Lo haremos requerido más adelante cuando migremos los datos
  },
  contenidoHtml: {
    type: String,
    required: true,
  },
  metadatosJson: {
    type: mongoose.Schema.Types.Mixed,
    default: {}, // Variables dinámicas: {{destinatario}}, {{asunto}}
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
  estado: {
    type: String,
    enum: ['borrador', 'activa', 'derogada'],
    default: 'borrador',
  },
  versionActual: {
    type: String,
    default: '0.1',
  },
}, { timestamps: true });

module.exports = mongoose.model('Plantilla', PlantillaSchema);
