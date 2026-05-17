const UsuarioEmpresa = require("../schema/usuarioEmpresa");
const { jsonResponse } = require("../lib/jsonResponse");

/**
 * Middleware para verificar que la petición incluya un contexto de empresa válido
 * y que el usuario autenticado tenga permisos en dicha empresa.
 */
const verifyEmpresaContext = async (req, res, next) => {
  const empresaId = req.header("X-Empresa-ID");

  if (!empresaId) {
    return res.status(400).json(
      jsonResponse(400, {
        error: "El encabezado X-Empresa-ID es obligatorio para esta operación.",
      })
    );
  }

  try {
    const vinculacion = await UsuarioEmpresa.findOne({
      usuarioId: req.user.id,
      empresaId: empresaId,
      estado: "ACTIVO",
    }).populate("rolId");

    if (!vinculacion) {
      return res.status(403).json(
        jsonResponse(403, {
          error: "No tienes acceso a esta empresa o tu membresía no está activa.",
        })
      );
    }

    // Adjuntar la información de la empresa y el rol al objeto req para uso posterior
    req.empresaContext = {
      id: empresaId,
      rol: vinculacion.rolId,
      isAdmin: vinculacion.rolId?.permissions?.isAdmin || false,
    };

    next();
  } catch (error) {
    console.error("Error en verifyEmpresaContext:", error);
    res.status(500).json(jsonResponse(500, { error: "Error al validar el contexto de empresa" }));
  }
};

module.exports = verifyEmpresaContext;
