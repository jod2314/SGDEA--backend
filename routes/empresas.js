const express = require("express");
const router = express.Router();
const Empresa = require("../schema/empresa");
const UsuarioEmpresa = require("../schema/usuarioEmpresa");
const Rol = require("../schema/rol");
const { jsonResponse } = require("../lib/jsonResponse");

// Buscar empresa por NIT
router.get("/buscar/:nit", async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ nit: req.params.nit });
    if (!empresa) {
      return res.status(404).json(jsonResponse(404, { message: "Empresa no encontrada" }));
    }
    
    // Verificar si el usuario ya pertenece a esta empresa
    const vinculacion = await UsuarioEmpresa.findOne({ 
      usuarioId: req.user.id, 
      empresaId: empresa._id 
    });

    res.json(jsonResponse(200, { 
      empresa: {
        id: empresa._id,
        name: empresa.name,
        nit: empresa.nit,
        logo: empresa.logo,
        direccion: empresa.direccion
      },
      yaVinculado: !!vinculacion
    }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al buscar empresa" }));
  }
});

// Vincularse a una empresa existente
router.post("/vincular", async (req, res) => {
  const { empresaId } = req.body;

  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json(jsonResponse(404, { error: "Empresa no encontrada" }));
    }

    const vinculacionExistente = await UsuarioEmpresa.findOne({ 
      usuarioId: req.user.id, 
      empresaId: empresa._id 
    });

    if (vinculacionExistente) {
      return res.status(400).json(jsonResponse(400, { error: "Ya estás vinculado a esta empresa" }));
    }

    // Por defecto, al vincularse a una empresa existente, se le asigna un rol de 'Visor' 
    // o se crea un registro en estado 'INVITADO' (aquí lo pondremos como Visor activo por simplicidad)
    let visorRol = await Rol.findOne({ empresaId: empresa._id, name: "Visor" });
    
    if (!visorRol) {
      // Si no existe el rol visor para esta empresa, lo creamos
      visorRol = new Rol({
        name: "Visor",
        empresaId: empresa._id,
        permissions: { isAdmin: false }
      });
      await visorRol.save();
    }

    const nuevaVinculacion = new UsuarioEmpresa({
      usuarioId: req.user.id,
      empresaId: empresa._id,
      rolId: visorRol._id,
      estado: "ACTIVO" 
    });
    await nuevaVinculacion.save();

    res.json(jsonResponse(200, { message: "Vinculación exitosa" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al vincular empresa" }));
  }
});

// Actualizar datos de una empresa o espacio personal
router.put("/:id", async (req, res) => {
  const { name, nit, direccion, logo, configuracion } = req.body;
  const { id } = req.params;

  try {
    // 1. Verificar que el usuario sea administrador en esta empresa
    const vinculacion = await UsuarioEmpresa.findOne({ 
      usuarioId: req.user.id, 
      empresaId: id 
    }).populate("rolId");

    if (!vinculacion || !vinculacion.rolId.permissions.isAdmin) {
      return res.status(403).json(jsonResponse(403, { error: "No tienes permisos para editar esta entidad" }));
    }

    // 2. Si se cambia el NIT, verificar que no exista en otra empresa
    if (nit) {
      const nitExists = await Empresa.findOne({ nit, _id: { $ne: id } });
      if (nitExists) {
        return res.status(409).json(jsonResponse(409, { error: "Este NIT/Cédula ya está registrado por otra entidad" }));
      }
    }

    // 3. Actualizar
    const empresaActualizada = await Empresa.findByIdAndUpdate(
      id,
      { name, nit, direccion, logo, configuracion },
      { new: true }
    );

    res.json(jsonResponse(200, { 
      message: "Datos actualizados correctamente",
      empresa: empresaActualizada 
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la entidad" }));
  }
});

// Listar todas las empresas a las que pertenece el usuario autenticado
router.get("/mis-empresas", async (req, res) => {
  try {
    // 1. Buscar membresías actuales
    let membresias = await UsuarioEmpresa.find({ usuarioId: req.user.id })
      .populate("empresaId")
      .populate("rolId");

    // 2. Verificar si existe el espacio personal
    const tienePersonal = membresias.some(m => m.empresaId && m.empresaId.isPersonal);

    if (!tienePersonal) {
      // LOGICA DE EMERGENCIA: Crear espacio personal si no existe
      const User = require("../schema/user");
      const user = await User.findById(req.user.id);
      
      if (user) {
        // a. Crear empresa personal
        const personalSpace = new Empresa({ 
          name: `Espacio Personal de ${user.name}`, 
          nit: user.identification, 
          isPersonal: true 
        });
        await personalSpace.save();

        // b. Crear rol admin
        const adminRol = new Rol({
          name: "Administrador Personal",
          empresaId: personalSpace._id,
          permissions: { isAdmin: true, isPersonal: true },
        });
        await adminRol.save();

        // c. Vincular
        const nuevaVinculacion = new UsuarioEmpresa({
          usuarioId: user._id,
          empresaId: personalSpace._id,
          rolId: adminRol._id,
        });
        await nuevaVinculacion.save();

        // d. Recargar membresías para incluirlas en la respuesta
        membresias = await UsuarioEmpresa.find({ usuarioId: req.user.id })
          .populate("empresaId")
          .populate("rolId");
      }
    }

    const empresas = membresias
      .filter(m => m.empresaId) // Evitar nulos si una empresa fue borrada
      .map((m) => ({
      id: m.empresaId._id,
      name: m.empresaId.name,
      nit: m.empresaId.nit,
      logo: m.empresaId.logo,
      isPersonal: m.empresaId.isPersonal,
      rol: m.rolId.name,
      estado: m.estado,
      direccion: m.empresaId.direccion
    }));

    res.json(jsonResponse(200, { empresas }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al obtener las empresas" }));
  }
});

// Crear una nueva empresa y vincular al usuario como administrador
router.post("/", async (req, res) => {
  const { name, nit, direccion } = req.body;

  if (!name || !nit) {
    return res.status(400).json(jsonResponse(400, { error: "Nombre y NIT son requeridos" }));
  }

  try {
    const empresaExists = await Empresa.exists({ nit });
    if (empresaExists) {
      return res.status(409).json(jsonResponse(409, { error: "El NIT ya está registrado" }));
    }

    // 1. Crear empresa
    const nuevaEmpresa = new Empresa({ name, nit, direccion });
    await nuevaEmpresa.save();

    // 2. Crear rol admin para esta empresa
    const adminRol = new Rol({
      name: "Administrador",
      empresaId: nuevaEmpresa._id,
      permissions: { isAdmin: true },
    });
    await adminRol.save();

    // 3. Vincular usuario actual
    const vinculacion = new UsuarioEmpresa({
      usuarioId: req.user.id,
      empresaId: nuevaEmpresa._id,
      rolId: adminRol._id,
    });
    await vinculacion.save();

    res.status(201).json(jsonResponse(201, {
      message: "Empresa creada y vinculada exitosamente",
      empresa: {
        id: nuevaEmpresa._id,
        name: nuevaEmpresa.name,
        rol: adminRol.name
      }
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear la empresa" }));
  }
});

module.exports = router;
