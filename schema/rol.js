const Mongoose = require("mongoose");

const RolSchema = new Mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  empresaId: {
    type: Mongoose.Schema.Types.ObjectId,
    ref: "Empresa",
    required: true,
  },
  permissions: {
    // Por ahora un objeto flexible, más adelante se puede definir una estructura estricta
    type: Mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Evitar roles duplicados por empresa
RolSchema.index({ name: 1, empresaId: 1 }, { unique: true });

module.exports = Mongoose.model("Rol", RolSchema);
