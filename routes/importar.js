const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const { jsonResponse } = require("../lib/jsonResponse");
const UnidadConservacion = require("../schema/unidadConservacion");

// Configuración de Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/inventario", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json(jsonResponse(400, { error: "No se subió ningún archivo" }));
  }

  try {
    // 1. Leer el archivo Excel desde el buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 2. Convertir a JSON
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json(jsonResponse(400, { error: "El archivo está vacío" }));
    }

    const itemsToInsert = [];
    const errors = [];

    // 3. Procesar y Validar cada fila
    for (const [index, row] of rawData.entries()) {
      const rowNum = index + 2; // Ajuste por encabezado (fila 1) y base 0

      // Validación mínima
      if (!row['Asunto'] && !row['Descripción']) {
        errors.push(`Fila ${rowNum}: Falta 'Asunto' o 'Descripción'.`);
        continue;
      }

      // Mapeo de columnas Excel -> Schema Mongoose
      // Asumimos que el Excel tiene encabezados amigables
      const newItem = {
        empresa: req.user.empresaId,
        creadoPor: req.user.id,
        numeroOrden: row['No. Orden'] || row['Orden'],
        codigo: row['Código'] || row['Codigo'],
        nombreSerie: row['Serie'],
        nombreSubserie: row['Subserie'],
        asunto: row['Asunto'] || row['Descripción'] || 'Sin Asunto',
        
        // Fechas (Excel a veces devuelve números seriales, xlsx trata de manejarlo pero es delicado)
        // Aquí asumimos formato texto YYYY-MM-DD o fechas JS nativas si xlsx las parseó
        fechaInicial: row['Fecha Inicial'],
        fechaFinal: row['Fecha Final'],
        
        unidadConservacion: row['Unidad de Conservación'] || 'Carpeta',
        numeroCaja: row['No. Caja'] ? String(row['No. Caja']) : undefined,
        numeroCarpeta: row['No. Carpeta'] ? String(row['No. Carpeta']) : undefined,
        numeroFolios: row['No. Folios'] || 0,
        soporte: row['Soporte'] || 'Papel',
        frecuenciaConsulta: row['Frecuencia'] || 'Baja',
        notas: row['Notas'] || row['Observaciones']
      };

      itemsToInsert.push(newItem);
    }

    // 4. Inserción Masiva
    if (itemsToInsert.length > 0) {
      await UnidadConservacion.insertMany(itemsToInsert);
    }

    res.json(jsonResponse(200, { 
      message: "Proceso completado",
      resumen: {
        totalProcesado: rawData.length,
        insertados: itemsToInsert.length,
        fallidos: errors.length,
        errores: errors // Devolver lista de errores para que el usuario corrija
      }
    }));

  } catch (error) {
    console.error(error);
    res.status(500).json(jsonResponse(500, { error: "Error procesando el archivo: " + error.message }));
  }
});

module.exports = router;
