const mongoose = require('mongoose');

/**
 * Esquema para el Cuadro Evolutivo Orgánico-Funcional (CEOF) e Historia Institucional
 */
const CEOFSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    unique: true
  },
  // Cuestionario de Historia Institucional
  cuestionarioHistoria: {
    fechaCreacionEntidad: { type: Date },
    actoAdministrativoCreacion: { type: String, trim: true },
    entidadesPredecesoras: [String],
    cambiosEstructuralesHistoricos: { type: String, trim: true },
    soporteLegalAdjuntoUrl: { type: String }
  },
  // Períodos Orgánico-Funcionales
  periodosHistoricos: [{
    nombrePeriodo: { type: String, required: true },
    fechaInicial: { type: Date, required: true },
    fechaFinal: { type: Date },
    dependenciasHistoricas: [{
      codigo: { type: String, required: true },
      nombre: { type: String, required: true },
      funcionesAsignadas: [String],
      oficinaProductora: { type: Boolean, default: true }
    }]
  }],
  estado: {
    type: String,
    enum: ['EN_REVISION', 'APROBADO'],
    default: 'EN_REVISION'
  }
}, { timestamps: true });

module.exports = mongoose.model('CEOF', CEOFSchema);
