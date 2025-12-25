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

// Middleware pre-save para calcular métricas automáticamente
DiagnosticoSchema.pre('save', function(next) {
  // Factores de conversión estándar (Aproximados AGN)
  // Caja X200 = 0.12 metros lineales (aprox)
  // Carpeta llena = 0.015 - 0.02 metros lineales
  // Tomo empastado = 0.03 - 0.05 metros lineales
  
  if (this.conteo) {
    const mlCajas = (this.conteo.cajas || 0) * 0.12;
    const mlCarpetas = (this.conteo.carpetas || 0) * 0.015;
    const mlTomos = (this.conteo.tomos || 0) * 0.04;
    
    this.metrosLineales = parseFloat((mlCajas + mlCarpetas + mlTomos).toFixed(2));
    
    // Proyección de Insumos (Lógica simple para ejemplo)
    // Si tengo carpetas sueltas, necesito cajas para ellas (aprox 6 carpetas por caja)
    // Si tengo tomos, no necesitan cajas necesariamente.
    // Esto es una estimación base.
    
    const carpetasSinCaja = this.conteo.carpetas || 0;
    const cajasNecesariasParaCarpetas = Math.ceil(carpetasSinCaja / 6);
    
    // Total cajas X200 nuevas a comprar (asumiendo que las cajas actuales ya existen)
    // Si es un diagnóstico de "lo que hay suelto", proyectamos insumos.
    // Si es "lo que ya está en cajas", no necesitamos insumos.
    // Asumiremos que el conteo de 'carpetas' son unidades sueltas por organizar.
    
    this.insumosProyectados = {
      cajasX200: cajasNecesariasParaCarpetas,
      carpetasYute: Math.ceil(carpetasSinCaja * 1.1), // 10% de desperdicio/reemplazo
      ganchosLegajadores: Math.ceil(carpetasSinCaja * 1.1)
    };
  }
  next();
});

module.exports = mongoose.model('Diagnostico', DiagnosticoSchema);