const mongoose = require('mongoose');

/**
 * Esquema para Fichas de Valoración Documental (FVD) y Tabla de Valoración Documental (TVD)
 * Estándar del Archivo General de la Nación (AGN)
 */

// Esquema de Ficha de Valoración Documental por Serie/Subserie (FVD)
const FVDSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  codigoSerie: { type: String, required: true },
  nombreSerie: { type: String, required: true },
  codigoSubserie: { type: String },
  nombreSubserie: { type: String },
  // Valores Primarios
  valoresPrimarios: {
    administrativo: { type: Boolean, default: false },
    juridico: { type: Boolean, default: false },
    contable: { type: Boolean, default: false },
    fiscal: { type: Boolean, default: false }
  },
  // Valores Secundarios
  valoresSecundarios: {
    historico: { type: Boolean, default: false },
    cientifico: { type: Boolean, default: false },
    cultural: { type: Boolean, default: false },
    derechosHumanosDDHH: { type: Boolean, default: false }
  },
  // Tiempos de Retención y Disposición Final (TVD)
  retencionCentralAnios: { type: Number, required: true, default: 5 },
  disposicionFinal: {
    type: String,
    enum: ['CT', 'E', 'S', 'MD'], // Conservación Total, Eliminación, Selección, Microfilmación/Digitalización
    required: true,
    default: 'CT'
  },
  procedimientoDisposicion: { type: String, required: true },
  // Workflow de Validación
  validacionJuridica: {
    aprobado: { type: Boolean, default: false },
    observaciones: String,
    validador: String
  },
  validacionHistorica: {
    aprobado: { type: Boolean, default: false },
    observaciones: String,
    validador: String
  }
}, { timestamps: true });

// Esquema de Acta de Comité e Integración TVD
const TVDConsolidadaSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    unique: true
  },
  numeroActaComite: { type: String, required: true },
  fechaAprobacionComite: { type: Date, required: true },
  integrantesComite: [{
    nombre: String,
    cargo: String
  }],
  fvdItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FVD'
  }],
  actaPdfUrl: { type: String },
  estado: {
    type: String,
    enum: ['BORRADOR', 'APROBADA_COMITE', 'CONVALIDADA_AGN'],
    default: 'BORRADOR'
  }
}, { timestamps: true });

module.exports = {
  FVD: mongoose.model('FVD', FVDSchema),
  TVDConsolidada: mongoose.model('TVDConsolidada', TVDConsolidadaSchema)
};
