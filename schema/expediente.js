const mongoose = require('mongoose');

const ExpedienteSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fechaCreacion: { type: Date, default: Date.now },

  // Identificación del Expediente
  codigo: { type: String, required: true, unique: true }, // Ej: EXP-2023-001
  titulo: { type: String, required: true }, // Ej: "Contrato de Prestación de Servicios 001"
  descripcion: { type: String },

  // Clasificación (TRD)
  idTRDSerie: { type: mongoose.Schema.Types.ObjectId, ref: 'TRD.items' },
  codigoTRDSerie: { type: String },
  nombreTRDSerie: { type: String },
  nombreSubserie: { type: String },

  // Contenido (Índice Electrónico)
  documentos: [{
    documento: { type: mongoose.Schema.Types.ObjectId, ref: 'Documento' },
    fechaVinculacion: { type: Date, default: Date.now },
    folioInicio: { type: Number }, // Paginación electrónica
    folioFin: { type: Number }
  }],

  // Estado y Ciclo de Vida
  estado: { type: String, enum: ['Abierto', 'Cerrado', 'Transferido', 'Eliminado'], default: 'Abierto' },
  fechaApertura: { type: Date, default: Date.now },
  fechaCierre: { type: Date }, // Importante para contar retención
  
  ubicacionFisica: { type: String }, // Si es híbrido
  etiquetas: [String],
});

module.exports = mongoose.model('Expediente', ExpedienteSchema);