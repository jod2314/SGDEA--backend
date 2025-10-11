const mongoose = require('mongoose');

const UnidadConservacionSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  codigo: { type: String, required: true }, // ej: "Caja 001"
  tipo: { type: String, enum: ['Caja','Folder','Carpeta','Otro'], default: 'Caja' },
  descripcion: { type: String },
  fechaInicio: { type: Date },
  fechaFin: { type: Date },
  volumen: { type: Number, comment: 'metros lineales o numero de folios' },
  ubicacionFisica: { type: String },
  estadoConservacion: { type: String, enum: ['Bueno','Regular','Malo'], default: 'Regular' },
  etiquetas: [String],
  anexos: [{ nombre: String, url: String }],
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UnidadConservacion', UnidadConservacionSchema);