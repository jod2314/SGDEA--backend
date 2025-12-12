const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fechaCreacion: { type: Date, default: Date.now },

  // Metadatos de Radicación
  numeroRadicacion: { type: String, required: true, unique: true }, // Consecutivo único
  fechaRadicacion: { type: Date, default: Date.now },
  tipoDocumento: { type: String, required: true, enum: ['Oficio', 'Acta', 'Factura', 'Contrato', 'Circular', 'Informe', 'Otro'] },
  asunto: { type: String, required: true },
  descripcion: { type: String },

  // Remitente/Destinatario
  remitente: { type: String },
  destinatario: { type: String },

  // Datos del Archivo Digital (si aplica)
  esDigital: { type: Boolean, default: false },
  rutaArchivo: { type: String }, // URL o path al archivo (ej. S3, disco local)
  nombreArchivo: { type: String },
  tipoMime: { type: String },
  tamanioArchivo: { type: Number }, // En bytes

  // Ubicación física (si aplica y es digitalizado)
  ubicacionFisica: { type: String }, // Ej: "Caja 001 / Carpeta 005"
  
  // Vinculación a TRD
  idTRDSerie: { type: mongoose.Schema.Types.ObjectId, ref: 'TRD.items' }, // Referencia a la serie de la TRD
  codigoTRDSerie: { type: String }, // Para facilitar búsquedas sin populate
  nombreTRDSerie: { type: String },

  // Ciclo de Vida del Documento
  estado: { type: String, enum: ['En Trámite', 'Archivado Gestión', 'Archivado Central', 'Eliminado'], default: 'En Trámite' },
  fechaVencimientoAG: { type: Date }, // Fecha en que debe pasar a Archivo Central
  fechaVencimientoAC: { type: Date }, // Fecha en que debe ser dispuesto según TRD

  // Trazabilidad
  historialEventos: [{
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    evento: { type: String }, // Creado, Editado, Archivado, Transferido, Eliminado, Digitalizado
    fecha: { type: Date, default: Date.now },
    observaciones: { type: String }
  }],
});

module.exports = mongoose.model('Documento', DocumentoSchema);