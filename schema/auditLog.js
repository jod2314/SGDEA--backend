const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', index: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  accion: { type: String, required: true, index: true },
  tipoRecurso: { type: String, index: true }, // Ej: 'PLANTILLA', 'EXPEDIENTE', 'DOCUMENTO'
  recursoId: { type: String, index: true },    // ID del objeto afectado
  detalles: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  fecha: { type: Date, default: Date.now, index: true }
});

AuditLogSchema.index({ empresa: 1, fecha: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
