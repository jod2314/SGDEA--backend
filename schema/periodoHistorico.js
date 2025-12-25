const mongoose = require('mongoose');

const PeriodoHistoricoSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaCreacion: { type: Date, default: Date.now },
  
  nombre: { type: String, required: true }, // Ej: "Fundación y Primeros Años", "Reestructuración 2010"
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  
  actoAdministrativo: { type: String }, // Resolución No. XXX que define la estructura de este periodo
  
  descripcion: { type: String },
  estado: { type: String, enum: ['Abierto', 'Cerrado'], default: 'Abierto' }
});

// Validación para asegurar que fechaInicio < fechaFin
PeriodoHistoricoSchema.pre('validate', function(next) {
  if (this.fechaInicio && this.fechaFin && this.fechaInicio > this.fechaFin) {
    this.invalidate('fechaFin', 'La fecha final debe ser posterior a la fecha inicial.');
  }
  next();
});

module.exports = mongoose.model('PeriodoHistorico', PeriodoHistoricoSchema);