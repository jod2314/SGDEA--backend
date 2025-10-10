const Mongoose = require("mongoose");

const EmpresaSchema = new Mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  nit: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Mongoose.model("Empresa", EmpresaSchema);
