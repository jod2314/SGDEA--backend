const mongoose = require('mongoose');

const PlantillaHistoricoSchema = new mongoose.Schema({
  plantillaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantilla',
    required: true,
  },
  version: {
    type: Number,
    required: true,
  },
  datosVersion: {
    nombre: String,
    descripcion: String,
    contenidoHtml: String,
  },
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fechaModificacion: {
    type: Date,
    default: Date.now,
  },
  comentario: {
    type: String,
    trim: true,
  },
});

// Índice compuesto para búsquedas rápidas por plantilla y versión
PlantillaHistoricoSchema.index({ plantillaId: 1, version: -1 });

module.exports = mongoose.model('PlantillaHistorico', PlantillaHistoricoSchema);
