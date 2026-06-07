const mongoose = require('mongoose');

const HistorialDocumentoSchema = new mongoose.Schema({
  plantillaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantilla',
    required: false,
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
  numeroRadicado: {
    type: String,
  },
  expedienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expediente',
  },
  codigoTRD: {
    type: String,
  },
  tipoArchivo: {
    type: String,
    enum: ['PDF', 'DOCX'],
    default: 'PDF',
  },
  // Opcional: Referencia a un archivo en S3 o almacenamiento de buffers (no recomendado en MongoDB para archivos grandes)
}, { timestamps: true });

HistorialDocumentoSchema.index({ empresaId: 1, createdAt: -1 });
HistorialDocumentoSchema.index({ numeroRadicado: 1 }, { sparse: true });

module.exports = mongoose.model('HistorialDocumento', HistorialDocumentoSchema);
