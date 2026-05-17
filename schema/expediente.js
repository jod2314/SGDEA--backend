const mongoose = require('mongoose');

const ExpedienteSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  nombreExpediente: {
    type: String, // Ej: "Mantenimiento de Redes - Contrato 001"
    required: true,
    trim: true,
  },
  codigoTRD: {
    type: String, // Ej: "1100-02-01"
    required: true,
  },
  dependenciaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dependencia',
    required: true,
  },
  subserieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubserieDocumental',
    required: true,
  },
  descripcion: {
    type: String,
    trim: true,
  },
  estado: {
    type: String,
    enum: ['ABIERTO', 'CERRADO'],
    default: 'ABIERTO',
  },
  fechaApertura: {
    type: Date,
    default: Date.now,
  },
  fechaCierre: {
    type: Date,
  },
  indiceXml: {
    type: String, // Contenido del Índice Electrónico XML generado al cerrar
  },
  responsableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

ExpedienteSchema.index({ empresaId: 1, codigoTRD: 1 });

module.exports = mongoose.model('Expediente', ExpedienteSchema);
