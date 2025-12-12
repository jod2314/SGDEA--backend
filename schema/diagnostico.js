const mongoose = require('mongoose');

const DiagnosticoSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Removed required temporarily for upserts
  fechaCreacion: { type: Date, default: Date.now },
  historiaInstitucional: { type: String }, // hitos, reorganizaciones
  estructuraAnterior: { type: String }, // Estructuras orgánicas pasadas
  fechasClave: [{ fecha: Date, descripcion: String }], // Hitos temporales
  organigramas: [{ tipo: String, descripcion: String, archivoUrl: String }],
  infraestructura: {
    condicionFisica: String,
    temperatura: String,
    humedad: String,
    observaciones: String
  },
  resumenCCDPropuesto: [{ nivel: Number, codigo: String, descripcion: String }],
  observaciones: String,
  version: { type: Number, default: 1 }
});

module.exports = mongoose.model('Diagnostico', DiagnosticoSchema);