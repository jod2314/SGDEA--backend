const express = require("express");
const { jsonResponse } = require("../lib/jsonResponse");
const router = express.Router();

// Importar los nuevos modelos
const Empresa = require("../schema/empresa");
const Rol = require("../schema/rol");
const User = require("../schema/user");
const UsuarioEmpresa = require("../schema/usuarioEmpresa");

router.post("/", async function (req, res, next) {
  const { username, password, name, identification } = req.body;

  if (!username || !password || !name || !identification) {
    return res.status(400).json(
      jsonResponse(400, {
        error: "Nombre, identificación, usuario y contraseña son requeridos",
      })
    );
  }

  try {
    // 1. Verificar si el usuario o la identificación ya existen
    const userExists = await User.exists({ username });
    if (userExists) {
      return res.status(409).json(jsonResponse(409, { error: "El nombre de usuario ya existe" }));
    }

    const idExists = await User.exists({ identification });
    if (idExists) {
      return res.status(409).json(jsonResponse(409, { error: "La identificación ya está registrada" }));
    }

    // --- Inicio de la creación ---

    // 2. Crear el nuevo usuario (global)
    const newUser = new User({
      username,
      password,
      name,
      identification,
    });
    await newUser.save();

    // 3. Crear el Espacio Personal para el usuario usando su identificación como NIT
    const personalSpace = new Empresa({ 
      name: `Espacio Personal de ${name}`, 
      nit: identification, // La identificación del usuario es el NIT de su espacio personal
      isPersonal: true 
    });
    await personalSpace.save();

    // 4. Crear el rol de Administrador para el espacio personal
    const adminRol = new Rol({
      name: "Administrador Personal",
      empresaId: personalSpace._id,
      permissions: { isAdmin: true, isPersonal: true },
    });
    await adminRol.save();

    // 5. Vincular usuario con su espacio personal
    const vinculacion = new UsuarioEmpresa({
      usuarioId: newUser._id,
      empresaId: personalSpace._id,
      rolId: adminRol._id,
      estado: "ACTIVO",
    });
    await vinculacion.save();

    // --- Fin de la creación ---

    res.json(
      jsonResponse(200, {
        message: "Usuario y espacio personal creados exitosamente",
      })
    );

  } catch (err) {
    console.error(err);
    return res.status(500).json(
      jsonResponse(500, {
        error: "Error en el servidor al crear la cuenta",
      })
    );
  }
});

module.exports = router;