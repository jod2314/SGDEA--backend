const mongoose = require('mongoose');

const EstructuraOrganicaSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  periodoHistorico: { type: mongoose.Schema.Types.ObjectId, ref: 'PeriodoHistorico', required: true, index: true },
  
  codigo: { type: String, required: true }, // Código de la dependencia (Ej: "100", "110")
  nombre: { type: String, required: true }, // Nombre de la dependencia (Ej: "Gerencia General")
  
  padre: { type: mongoose.Schema.Types.ObjectId, ref: 'EstructuraOrganica', default: null }, // Para jerarquía (Organigrama)
  
  nivelJerarquico: { type: String, enum: ['Direccion', 'Subdireccion', 'Division', 'Seccion', 'Grupo', 'Otro'] },
  
  activa: { type: Boolean, default: true }
});

// Índice compuesto para evitar códigos duplicados DENTRO del mismo periodo histórico
EstructuraOrganicaSchema.index({ periodoHistorico: 1, codigo: 1 }, { unique: true });

module.exports = mongoose.model('EstructuraOrganica', EstructuraOrganicaSchema);