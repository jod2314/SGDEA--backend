const express = require("express");
const router = express.Router();
const Entidad = require("../schema/entidad");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

// Listar entidades de la empresa activa
router.get("/", async (req, res) => {
  const empresaId = req.header("X-Empresa-ID");
  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  try {
    const entidades = await Entidad.find({ empresaId, activa: true });
    res.json(jsonResponse(200, { entidades }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener entidades" }));
  }
});

// Buscar entidad por identificación (autocompletado)
router.get("/buscar/:identificacion", async (req, res) => {
  const { identificacion } = req.params;
  const empresaId = req.header("X-Empresa-ID");

  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  try {
    const entidad = await Entidad.findOne({ numeroIdentificacion: identificacion, empresaId });
    if (!entidad) {
      return res.status(404).json(jsonResponse(404, { message: "Entidad no encontrada" }));
    }
    res.json(jsonResponse(200, { entidad }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al buscar entidad" }));
  }
});

// Crear nueva entidad
router.post("/", async (req, res) => {
  const { tipo, numeroIdentificacion, nombre, apellidos, razonSocial, direccion, telefono, correo, ciudad, departamento } = req.body;
  const empresaId = req.header("X-Empresa-ID");

  if (!empresaId) {
    return res.status(400).json(jsonResponse(400, { error: "X-Empresa-ID header es requerido" }));
  }

  if (!tipo || !numeroIdentificacion || !nombre) {
    return res.status(400).json(jsonResponse(400, { error: "Tipo, identificación y nombre son requeridos" }));
  }

  try {
    const entidadExists = await Entidad.exists({ numeroIdentificacion, empresaId });
    if (entidadExists) {
      return res.status(409).json(jsonResponse(409, { error: "La entidad ya está registrada en esta empresa" }));
    }

    const nuevaEntidad = new Entidad({
      tipo,
      numeroIdentificacion,
      nombre,
      apellidos,
      razonSocial,
      direccion,
      telefono,
      correo,
      ciudad,
      departamento,
      empresaId
    });
    await nuevaEntidad.save();

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'CREAR_ENTIDAD',
      detalles: { nombre, identificacion: numeroIdentificacion }
    });

    res.status(201).json(jsonResponse(201, { entidad: nuevaEntidad }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al crear la entidad" }));
  }
});

module.exports = router;
