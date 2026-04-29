const mongoose = require('mongoose');

const HistorialDocumentoSchema = new mongoose.Schema({
  plantillaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantilla',
    required: true,
  },
  datosUsados: {
    type: Object,
    required: true,
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  fechaGeneracion: {
    type: Date,
    default: Date.now,
  },
  hashIntegridad: {
    type: String,
    required: true,
  },
  tipoArchivo: {
    type: String,
    enum: ['PDF', 'DOCX'],
    default: 'PDF',
  },
  // Opcional: Referencia a un archivo en S3 o almacenamiento de buffers (no recomendado en MongoDB para archivos grandes)
}, { timestamps: true });

module.exports = mongoose.model('HistorialDocumento', HistorialDocumentoSchema);
