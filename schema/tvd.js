const mongoose = require('mongoose');

const TVDSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fechaCreacion: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  items: [{
    unidadConservacion: { type: mongoose.Schema.Types.ObjectId, ref: 'UnidadConservacion' }, // opcional
    dependencia: { type: mongoose.Schema.Types.ObjectId, ref: 'EstructuraOrganica' }, // Link to dependency
    serie: { type: String }, // serie/subserie/expediente
    fechaInicio: Date,
    fechaFin: Date,
    volumen: Number,
    valorAdministrativo: { type: Number, enum: [0,1], comment: '0=no,1=si' },
    valorLegal: { type: Number, enum: [0,1] },
    valorHistorico: { type: Number, enum: [0,1] },
    decision: { type: String, enum: ['Conservacion Total','Eliminacion','Seleccion','Digitalizacion'] },
    retenionMeses: { type: Number }, // o años según política
    observaciones: String,
  }],
  aprobadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // comité de archivo
  aprobado: { type: Boolean, default: false },
  actas: [{ tipo: String, fecha: Date, url: String }]
});

module.exports = mongoose.model('TVD', TVDSchema);