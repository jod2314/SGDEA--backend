const Mongoose = require("mongoose");

const EmpresaSchema = new Mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  nit: {
    type: String,
    unique: true,
    trim: true,
    sparse: true, // Permite múltiples documentos con valor nulo para NIT (espacios personales)
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
  direccion: {
    type: String,
    trim: true,
  },
  logo: {
    type: String, // Almacenará la imagen en Base64 o una URL
  },
  configuracion: {
    tipografia: { type: String, default: "Arial" },
    colores: {
      primario: { type: String, default: "#000000" },
      secundario: { type: String, default: "#666666" },
    },
    margenesDefecto: {
      top: { type: String, default: "2.5cm" },
      bottom: { type: String, default: "2.5cm" },
      left: { type: String, default: "3cm" },
      right: { type: String, default: "2.5cm" },
    },
  },
  planSuscripcion: {
    type: String,
    enum: ["BASIC", "PRO", "ENTERPRISE"],
    default: "BASIC",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Mongoose.model("Empresa", EmpresaSchema);
