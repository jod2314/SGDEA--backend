const Mongoose = require("mongoose");

const UsuarioEmpresaSchema = new Mongoose.Schema({
  usuarioId: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  empresaId: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "Empresa",
    required: true,
  },
  rolId: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "Rol",
    required: true,
  },
  estado: {
    type: String,
    enum: ["ACTIVO", "INVITADO", "SUSPENDIDO"],
    default: "ACTIVO",
  },
  fechaVinculacion: {
    type: Date,
    default: Date.now,
  },
});

// Índice para asegurar que un usuario no tenga duplicidad de membresía en la misma empresa
UsuarioEmpresaSchema.index({ usuarioId: 1, empresaId: 1 }, { unique: true });

module.exports = Mongoose.model("UsuarioEmpresa", UsuarioEmpresaSchema);
