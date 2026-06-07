const mongoose = require('mongoose');

/**
 * Esquema secundario para los ítems individuales de riesgo en el depósito
 */
const RiesgoItemSchema = new mongoose.Schema({
  codigoRiesgo: {
    type: String,
    required: true,
    trim: true, // Ej. "R-01", "R-02"
  },
  descripcion: {
    type: String,
    required: true,
    trim: true, // Ej. "Inundación por rotura de tuberías", "Plagas de roedores"
  },
  probabilidad: {
    type: Number,
    required: true,
    min: 1, // Escala de 1 a 5 (Muy Baja a Muy Alta)
    max: 5,
  },
  impacto: {
    type: Number,
    required: true,
    min: 1, // Escala de 1 a 5 (Leve a Catastrófico)
    max: 5,
  },
  nivelRiesgo: {
    type: Number,
    // Se calcula automáticamente mediante el middleware pre('save')
    default: 0,
  },
  controles: {
    type: String,
    trim: true, // Ej. "Inspecciones mensuales, estibas de plástico..."
  },
  estado: {
    type: String,
    enum: ['activo', 'mitigado', 'materializado'],
    default: 'activo',
  }
});

/**
 * Esquema para Matriz de Riesgos de Depósito de Archivo
 * Permite identificar, evaluar y monitorear los riesgos físicos y ambientales del depósito de archivo físico
 * según los lineamientos de conservación preventiva del Archivo General de la Nación (AGN).
 */
const MatrizRiesgosDepositoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    unique: true, // Se limita a una única matriz activa de riesgos de depósito por empresa
  },
  nombre: {
    type: String,
    required: true,
    trim: true, // Ej. "Matriz de Conservación Preventiva del Depósito Principal"
  },
  descripcion: {
    type: String,
    trim: true,
  },
  riesgos: [RiesgoItemSchema],
  usuarioActualizadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Middleware pre-save para calcular el nivel de cada riesgo como probabilidad * impacto
MatrizRiesgosDepositoSchema.pre('save', function(next) {
  if (this.riesgos && this.riesgos.length > 0) {
    this.riesgos.forEach(riesgo => {
      if (typeof riesgo.probabilidad === 'number' && typeof riesgo.impacto === 'number') {
        riesgo.nivelRiesgo = riesgo.probabilidad * riesgo.impacto;
      }
    });
  }
  next();
});

module.exports = mongoose.model('MatrizRiesgosDeposito', MatrizRiesgosDepositoSchema);
