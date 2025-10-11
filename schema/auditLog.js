const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accion: String,
  detalles: mongoose.Schema.Types.Mixed,
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
