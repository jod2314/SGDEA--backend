const { jsonResponse } = require("../lib/jsonResponse");

const validate = (schema) => (req, res, next) => {
  try {
    // Validar req.body contra el esquema
    schema.parse(req.body);
    next();
  } catch (error) {
    // Si hay error de validación, devolver 400 Bad Request con detalles
    const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    return res.status(400).json(jsonResponse(400, { error: "Datos inválidos: " + errorMessages }));
  }
};

module.exports = validate;
