const express = require("express");
const { jsonResponse } = require("../lib/jsonResponse");
const router = express.Router();

// Importar los nuevos modelos
const Empresa = require("../schema/empresa");
const Rol = require("../schema/rol");
const User = require("../schema/user");

router.post("/", async function (req, res, next) {
  const { username, password, name, empresaName, nit } = req.body;

  if (!username || !password || !name || !empresaName || !nit) {
    return res.status(400).json(
      jsonResponse(400, {
        error: "Todos los campos son requeridos",
      })
    );
  }

  try {
    // 1. Verificar si el usuario o la empresa ya existen
    const userExists = await User.exists({ username });
    if (userExists) {
      return res.status(409).json(jsonResponse(409, { error: "El nombre de usuario ya existe" }));
    }

    const empresaExists = await Empresa.exists({ nit });
    if (empresaExists) {
      return res.status(409).json(jsonResponse(409, { error: "El NIT de la empresa ya está registrado" }));
    }

    // --- Inicio de la "transacción" ---

    // 2. Crear la nueva empresa
    const newEmpresa = new Empresa({ name: empresaName, nit });
    await newEmpresa.save();

    // 3. Crear el rol de Administrador para esa empresa
    const adminRol = new Rol({
      name: "Administrador",
      empresaId: newEmpresa._id,
      permissions: { isAdmin: true }, // Permisos de ejemplo
    });
    await adminRol.save();

    // 4. Crear el nuevo usuario y vincularlo
    const newUser = new User({
      username,
      password, // El pre-save hook se encargará de hashear
      name,
      empresaId: newEmpresa._id,
      rolId: adminRol._id,
    });

    await newUser.save();

    // --- Fin de la "transacción" ---

    res.json(
      jsonResponse(200, {
        message: "Empresa y usuario administrador creados exitosamente",
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