const express = require("express");
const router = express.Router();
const DatoMaestro = require("../schema/datoMaestro");
const { jsonResponse } = require("../lib/jsonResponse");
const { registrarAuditoria } = require("../lib/audit");

// Listar todos los datos maestros de la empresa
router.get("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const maestros = await DatoMaestro.find({ empresaId }).sort({ tipo: 1 });
    res.json(jsonResponse(200, { maestros }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener datos maestros" }));
  }
});

// Obtener un dato maestro específico por tipo
router.get("/:tipo", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipo } = req.params;
  try {
    const maestro = await DatoMaestro.findOne({ empresaId, tipo: tipo.toUpperCase() });
    if (!maestro) return res.status(404).json(jsonResponse(404, { error: "Dato maestro no encontrado" }));
    res.json(jsonResponse(200, { maestro }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al obtener el dato maestro" }));
  }
});

// Crear o actualizar un dato maestro (con histórico)
router.post("/", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  const { tipo, datos, comentario } = req.body;

  try {
    let maestro = await DatoMaestro.findOne({ empresaId, tipo: tipo.toUpperCase() });

    if (maestro) {
      // 1. Guardar versión anterior en histórico
      maestro.versiones.push({
        datos: maestro.datos,
        fechaCambio: new Date(),
        usuarioId: req.user.id,
        comentario: comentario || "Actualización manual"
      });

      // 2. Actualizar datos actuales
      maestro.datos = datos;
      maestro.vigenteDesde = new Date();
      await maestro.save();
    } else {
      // Crear nuevo
      maestro = new DatoMaestro({
        empresaId,
        tipo: tipo.toUpperCase(),
        datos,
        vigenteDesde: new Date()
      });
      await maestro.save();
    }

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR_DATO_MAESTRO',
      detalles: { tipo: tipo.toUpperCase(), comentario }
    });

    res.json(jsonResponse(200, { maestro }));
  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error al guardar dato maestro" }));
  }
});

// Eliminar un dato maestro
router.delete("/:id", async (req, res) => {
  const empresaId = req.headers["x-empresa-id"];
  try {
    const eliminado = await DatoMaestro.findOneAndDelete({ _id: req.params.id, empresaId });
    if (!eliminado) return res.status(404).json(jsonResponse(404, { error: "No encontrado" }));

    await registrarAuditoria({
      empresaId,
      usuarioId: req.user.id,
      accion: 'ELIMINAR_DATO_MAESTRO',
      detalles: { tipo: eliminado.tipo }
    });

    res.json(jsonResponse(200, { message: "Dato maestro eliminado" }));
  } catch (error) {
    res.status(500).json(jsonResponse(500, { error: "Error al eliminar" }));
  }
});

module.exports = router;
