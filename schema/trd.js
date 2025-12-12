const mongoose = require('mongoose');

const TRDSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fechaCreacion: { type: Date, default: Date.now },
  nombre: { type: String, required: true }, // Ej: "TRD General 2023"
  version: { type: Number, default: 1 },
  activa: { type: Boolean, default: true }, // Solo una TRD activa por empresa a la vez?

  items: [{
    codigoSerie: { type: String, required: true },
    nombreSerie: { type: String, required: true },
    
    // Si aplica
    codigoSubserie: { type: String },
    nombreSubserie: { type: String },

    // Retención en años
    retencionArchivoGestion: { type: Number, required: true, min: 0 },
    retencionArchivoCentral: { type: Number, required: true, min: 0 },

    // Disposición Final
    disposicionFinal: { type: String, enum: ['CT', 'E', 'M', 'S'], required: true }, // Conservación Total, Eliminación, Microfilmación/Digitalización, Selección
    
    procedimiento: { type: String }, // Explicación de la disposición
    
    observaciones: { type: String },
  }],
  aprobadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Opcional, para comité de archivo
  fechaAprobacion: { type: Date },
});

module.exports = mongoose.model('TRD', TRDSchema);