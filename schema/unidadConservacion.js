const mongoose = require('mongoose');

const UnidadConservacionSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  
  // Identificación en el Inventario
  numeroOrden: { type: Number }, // 1, 2, 3...
  codigo: { type: String }, // Código de Serie/Subserie (Opcional en fondos acumulados)
  
  // Productor (Procedencia)
  dependencia: { type: mongoose.Schema.Types.ObjectId, ref: 'EstructuraOrganica', index: true },

  // Descripción
  nombreSerie: { type: String }, 
  nombreSubserie: { type: String },
  asunto: { type: String, required: true }, // Descripción del contenido
  
  // Fechas Extremas
  fechaInicial: { type: Date },
  fechaFinal: { type: Date },
  
  // Unidad de Conservación y Almacenamiento
  unidadConservacion: { type: String, enum: ['Caja', 'Carpeta', 'Tomo', 'Otro'], default: 'Carpeta' },
  numeroCaja: { type: String }, // "1", "2"... o "A-01"
  numeroCarpeta: { type: String },
  numeroTomo: { type: String },
  otroUbicacion: { type: String },
  
  // Datos Físicos
  numeroFolios: { type: Number },
  soporte: { type: String, default: 'Papel' }, // Papel, Electrónico, CD, etc.
  frecuenciaConsulta: { type: String, enum: ['Alta', 'Media', 'Baja'], default: 'Baja' },
  
  // Ubicación Topográfica
  ubicacionFisica: { type: String }, // Estante 1, Entrepaño 2...
  
  // Estado y Gestión
  estadoConservacion: { type: String, enum: ['Bueno', 'Regular', 'Malo'], default: 'Regular' },
  notas: { type: String },
  
  etiquetas: [String],
  anexos: [{ nombre: String, url: String }],
  
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UnidadConservacion', UnidadConservacionSchema);