const Mongoose = require("mongoose");

const EmpresaSchema = new Mongoose.Schema({
  tipoPersona: {
    type: String,
    enum: ["natural", "juridica"],
    default: "juridica",
  },
  razonSocial: {
    type: String,
    required: true,
    trim: true,
  },
  nombreComercial: {
    type: String,
    trim: true,
  },
  nit: {
    type: String,
    unique: true,
    trim: true,
    sparse: true,
  },
  digitoVerificacion: {
    type: String,
    length: 1,
  },
  nombres: {
    type: String,
    trim: true,
  },
  primerApellido: {
    type: String,
    trim: true,
  },
  segundoApellido: {
    type: String,
    trim: true,
  },
  tipoDocumentoId: {
    type: String,
    default: "NIT",
  },
  numeroDocumentoId: {
    type: String,
  },
  sigla: {
    type: String,
    trim: true,
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
  direccion: {
    type: String,
    trim: true,
  },
  ciudad: {
    type: String,
    trim: true,
  },
  departamento: {
    type: String,
    trim: true,
  },
  telefono: {
    type: String,
    trim: true,
  },
  correo: {
    type: String,
    trim: true,
  },
  sitioWeb: {
    type: String,
    trim: true,
  },
  logo: {
    type: String, // Almacenará la imagen en Base64 o una URL
  },
  logoAlturaMm: {
    type: Number,
    default: 25.0,
  },
  logoAnchoMm: {
    type: Number,
    default: 60.0,
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
  onboardingCompleted: {
    type: Boolean,
    default: false,
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
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

module.exports = Mongoose.model("Empresa", EmpresaSchema);
