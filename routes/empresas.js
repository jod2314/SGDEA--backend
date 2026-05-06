const express = require("express");
const router = express.Router();
const Empresa = require("../schema/empresa");
const UsuarioEmpresa = require("../schema/usuarioEmpresa");
const Rol = require("../schema/rol");
const User = require("../schema/user");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

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
        razonSocial: empresa.razonSocial,
        nit: empresa.nit,
        logo: empresa.logo,
        direccion: empresa.direccion,
        tipoPersona: empresa.tipoPersona,
        nombreComercial: empresa.nombreComercial,
        sigla: empresa.sigla,
        nombres: empresa.nombres,
        primerApellido: empresa.primerApellido,
        segundoApellido: empresa.segundoApellido,
        tipoDocumentoId: empresa.tipoDocumentoId,
        numeroDocumentoId: empresa.numeroDocumentoId,
        digitoVerificacion: empresa.digitoVerificacion,
        ciudad: empresa.ciudad,
        departamento: empresa.departamento,
        telefono: empresa.telefono,
        correo: empresa.correo,
        sitioWeb: empresa.sitioWeb
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

    let visorRol = await Rol.findOne({ empresaId: empresa._id, name: "Visor" });
    
    if (!visorRol) {
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

    await registrarAuditoria({
      empresaId: empresa._id,
      usuarioId: req.user.id,
      accion: 'VINCULAR_EMPRESA',
      detalles: { razonSocial: empresa.razonSocial }
    });

    res.json(jsonResponse(200, { message: "Vinculación exitosa" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al vincular empresa" }));
  }
});

// Actualizar datos de una empresa o espacio personal
router.put("/:id", async (req, res) => {
  const { 
    razonSocial, nit, direccion, logo, configuracion,
    tipoPersona, nombreComercial, nombres, primerApellido, segundoApellido,
    tipoDocumentoId, numeroDocumentoId, sigla, ciudad, departamento,
    telefono, correo, sitioWeb, logoAlturaMm, logoAnchoMm, digitoVerificacion
  } = req.body;
  const { id } = req.params;

  try {
    const vinculacion = await UsuarioEmpresa.findOne({ 
      usuarioId: req.user.id, 
      empresaId: id 
    }).populate("rolId");

    if (!vinculacion || !vinculacion.rolId.permissions.isAdmin) {
      return res.status(403).json(jsonResponse(403, { error: "No tienes permisos para editar esta entidad" }));
    }

    if (nit) {
      const nitExists = await Empresa.findOne({ nit, _id: { $ne: id } });
      if (nitExists) {
        return res.status(409).json(jsonResponse(409, { error: "Este NIT/Cédula ya está registrado por otra entidad" }));
      }
    }

    const empresaActualizada = await Empresa.findByIdAndUpdate(
      id,
      { 
        razonSocial, nit, direccion, logo, configuracion,
        tipoPersona, nombreComercial, nombres, primerApellido, segundoApellido,
        tipoDocumentoId, numeroDocumentoId, sigla, ciudad, departamento,
        telefono, correo, sitioWeb, logoAlturaMm, logoAnchoMm, digitoVerificacion
      },
      { new: true }
    );

    await registrarAuditoria({
      empresaId: id,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_EMPRESA',
      detalles: { razonSocial: empresaActualizada.razonSocial }
    });

    res.json(jsonResponse(200, { 
      message: "Datos actualizados correctamente",
      empresa: empresaActualizada 
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al actualizar la entidad" }));
  }
});

// Endpoint para inicializar el entorno del usuario tras el login
router.post("/inicializar", async (req, res) => {
  try {
    const userId = req.user.id;
    
    let vinculacionPersonal = await UsuarioEmpresa.findOne({ 
      usuarioId: userId 
    }).populate({
      path: 'empresaId',
      match: { isPersonal: true }
    });

    if (!vinculacionPersonal || !vinculacionPersonal.empresaId) {
      const todas = await UsuarioEmpresa.find({ usuarioId: userId }).populate("empresaId");
      vinculacionPersonal = todas.find(v => v.empresaId && v.empresaId.isPersonal);
    }

    if (!vinculacionPersonal) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json(jsonResponse(404, { error: "Usuario no encontrado" }));

      const personalSpace = new Empresa({ 
        razonSocial: `Espacio Personal de ${user.name}`, 
        nit: user.identification, 
        isPersonal: true 
      });
      await personalSpace.save();

      const adminRol = new Rol({
        name: "Administrador Personal",
        empresaId: personalSpace._id,
        permissions: { isAdmin: true, isPersonal: true },
      });
      await adminRol.save();

      vinculacionPersonal = new UsuarioEmpresa({
        usuarioId: userId,
        empresaId: personalSpace._id,
        rolId: adminRol._id,
      });
      await vinculacionPersonal.save();
      
      await registrarAuditoria({
        empresaId: personalSpace._id,
        usuarioId: userId,
        accion: 'INICIALIZAR_ESPACIO_PERSONAL',
        detalles: { nit: user.identification }
      });

      vinculacionPersonal = await UsuarioEmpresa.findById(vinculacionPersonal._id).populate("empresaId").populate("rolId");
    }

    res.json(jsonResponse(200, { 
      message: "Entorno inicializado",
      personalSpace: {
        id: vinculacionPersonal.empresaId._id,
        razonSocial: vinculacionPersonal.empresaId.razonSocial,
        nit: vinculacionPersonal.empresaId.nit,
        isPersonal: true,
        rol: vinculacionPersonal.rolId.name
      }
    }));
  } catch (error) {
    console.error("Error en inicialización:", error);
    res.status(500).json(jsonResponse(500, { error: "Error al inicializar entorno" }));
  }
});

// Listar todas las empresas a las que pertenece el usuario autenticado
router.get("/mis-empresas", async (req, res) => {
  try {
    let membresias = await UsuarioEmpresa.find({ usuarioId: req.user.id })
      .populate("empresaId")
      .populate("rolId");

    const tienePersonal = membresias.some(m => m.empresaId && m.empresaId.isPersonal);

    if (!tienePersonal) {
      const user = await User.findById(req.user.id);
      
      if (user) {
        const personalSpace = new Empresa({ 
          razonSocial: `Espacio Personal de ${user.name}`, 
          nit: user.identification, 
          isPersonal: true 
        });
        await personalSpace.save();

        const adminRol = new Rol({
          name: "Administrador Personal",
          empresaId: personalSpace._id,
          permissions: { isAdmin: true, isPersonal: true },
        });
        await adminRol.save();

        const nuevaVinculacion = new UsuarioEmpresa({
          usuarioId: user._id,
          empresaId: personalSpace._id,
          rolId: adminRol._id,
        });
        await nuevaVinculacion.save();

        membresias = await UsuarioEmpresa.find({ usuarioId: req.user.id })
          .populate("empresaId")
          .populate("rolId");
      }
    }

    const empresas = membresias
      .filter(m => m.empresaId)
      .map((m) => ({
      id: m.empresaId._id,
      razonSocial: m.empresaId.razonSocial,
      nit: m.empresaId.nit,
      logo: m.empresaId.logo,
      isPersonal: m.empresaId.isPersonal,
      rol: m.rolId.name,
      estado: m.estado,
      direccion: m.empresaId.direccion,
      tipoPersona: m.empresaId.tipoPersona,
      sigla: m.empresaId.sigla,
      onboardingCompleted: m.empresaId.onboardingCompleted,
      nombres: m.empresaId.nombres,
      primerApellido: m.empresaId.primerApellido,
      segundoApellido: m.empresaId.segundoApellido,
      ciudad: m.empresaId.ciudad,
      departamento: m.empresaId.departamento,
      telefono: m.empresaId.telefono,
      correo: m.empresaId.correo,
      sitioWeb: m.empresaId.sitioWeb,
      logoAlturaMm: m.empresaId.logoAlturaMm,
      logoAnchoMm: m.empresaId.logoAnchoMm,
      digitoVerificacion: m.empresaId.digitoVerificacion
    }));

    res.json(jsonResponse(200, { empresas }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al obtener las empresas" }));
  }
});

// Crear una nueva empresa y vincular al usuario como administrador
router.post("/", async (req, res) => {
  const { razonSocial, nit, direccion, tipoPersona } = req.body;

  if (!razonSocial || !nit) {
    return res.status(400).json(jsonResponse(400, { error: "Razón Social y NIT son requeridos" }));
  }

  try {
    const empresaExists = await Empresa.exists({ nit });
    if (empresaExists) {
      return res.status(409).json(jsonResponse(409, { error: "El NIT ya está registrado" }));
    }

    const nuevaEmpresa = new Empresa({ razonSocial, nit, direccion, tipoPersona });
    await nuevaEmpresa.save();

    const adminRol = new Rol({
      name: "Administrador",
      empresaId: nuevaEmpresa._id,
      permissions: { isAdmin: true },
    });
    await adminRol.save();

    const vinculacion = new UsuarioEmpresa({
      usuarioId: req.user.id,
      empresaId: nuevaEmpresa._id,
      rolId: adminRol._id,
    });
    await vinculacion.save();

    await registrarAuditoria({
      empresaId: nuevaEmpresa._id,
      usuarioId: req.user.id,
      accion: 'CREAR_EMPRESA',
      detalles: { razonSocial, nit }
    });

    res.status(201).json(jsonResponse(201, {
      message: "Empresa creada y vinculada exitosamente",
      empresa: {
        id: nuevaEmpresa._id,
        razonSocial: nuevaEmpresa.razonSocial,
        nit: nuevaEmpresa.nit,
        direccion: nuevaEmpresa.direccion,
        tipoPersona: nuevaEmpresa.tipoPersona,
        isPersonal: nuevaEmpresa.isPersonal,
        rol: adminRol.name,
        estado: "ACTIVO" // Estado por defecto de la vinculación
      }
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al crear la empresa" }));
  }
});

// Marcar onboarding como completado
router.post("/:id/onboarding/completar", async (req, res) => {
  const { id } = req.params;

  try {
    const empresa = await Empresa.findById(id);
    if (!empresa) {
      return res.status(404).json(jsonResponse(404, { error: "Empresa no encontrada" }));
    }

    // Verificar permisos (solo admin)
    const vinculacion = await UsuarioEmpresa.findOne({ 
      usuarioId: req.user.id, 
      empresaId: id 
    }).populate("rolId");

    if (!vinculacion || !vinculacion.rolId.permissions.isAdmin) {
      return res.status(403).json(jsonResponse(403, { error: "No tienes permisos para realizar esta acción" }));
    }

    empresa.onboardingCompleted = true;
    await empresa.save();

    await registrarAuditoria({
      empresaId: id,
      usuarioId: req.user.id,
      accion: 'COMPLETAR_ONBOARDING',
      detalles: { razonSocial: empresa.razonSocial }
    });

    res.json(jsonResponse(200, { message: "Onboarding completado exitosamente" }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al completar el onboarding" }));
  }
});

module.exports = router;
