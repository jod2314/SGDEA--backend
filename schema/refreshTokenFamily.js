const mongoose = require("mongoose");

const RefreshTokenFamilySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  counter: {
    type: Number,
    default: 0,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Limpieza automática de familias antiguas (ajustar según política de sesión)
  }
});

module.exports = mongoose.model("RefreshTokenFamily", RefreshTokenFamilySchema);
