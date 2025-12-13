const mongoose = require('mongoose');

const DiagnosticoSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Removed required temporarily for upserts
  fechaCreacion: { type: Date, default: Date.now },
  historiaInstitucional: { type: String }, // hitos, reorganizaciones
  estructuraAnterior: { type: String }, // Estructuras orgánicas pasadas
  fechasClave: [{ fecha: Date, descripcion: String }], // Hitos temporales
  organigramas: [{ tipo: String, descripcion: String, archivoUrl: String }],
  
  // Métricas Cuantitativas (Fase 2.1)
  conteo: {
    cajas: { type: Number, default: 0 },
    carpetas: { type: Number, default: 0 },
    tomos: { type: Number, default: 0 },
    otros: { type: Number, default: 0 }
  },
  metrosLineales: { type: Number, default: 0 }, // Calculado: (Cajas * 0.12) + (Carpetas * 0.015) + (Tomos * 0.05) aprox
  
  insumosProyectados: {
    cajasX200: { type: Number },
    carpetasYute: { type: Number },
    ganchosLegajadores: { type: Number }
  },

  estadoBiologico: {
    porcentajeHongos: { type: Number, min: 0, max: 100 },
    porcentajeInsectos: { type: Number, min: 0, max: 100 },
    porcentajePolvo: { type: Number, min: 0, max: 100 }
  },

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