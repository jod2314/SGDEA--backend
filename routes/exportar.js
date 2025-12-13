const express = require("express");
const router = express.Router();
const xlsx = require("xlsx");
const UnidadConservacion = require("../schema/unidadConservacion");

router.get("/fuid", async (req, res) => {
  try {
    // 1. Obtener datos de la base de datos
    const items = await UnidadConservacion.find({ empresa: req.user.empresaId })
                                        .sort({ numeroOrden: 1 });

    if (!items || items.length === 0) {
      return res.status(404).json({ error: "No hay datos para exportar" });
    }

    // 2. Preparar los datos para el formato FUID
    // El FUID oficial tiene columnas específicas. Mapeamos nuestros datos a ese formato.
    const fuidData = items.map((item, index) => ({
      "No. Orden": item.numeroOrden || index + 1,
      "Código": item.codigo || "",
      "Nombre de la Serie, Subserie o Asunto": `${item.nombreSerie || ''} ${item.nombreSubserie || ''} - ${item.asunto}`,
      "Fechas Extremas (Inicial)": item.fechaInicial ? new Date(item.fechaInicial).toISOString().split('T')[0] : "",
      "Fechas Extremas (Final)": item.fechaFinal ? new Date(item.fechaFinal).toISOString().split('T')[0] : "",
      "Unidad de Conservación": item.unidadConservacion,
      "No. Caja": item.numeroCaja,
      "No. Carpeta": item.numeroCarpeta,
      "No. Tomo": item.numeroTomo || "",
      "No. Folios": item.numeroFolios,
      "Soporte": item.soporte,
      "Frecuencia Consulta": item.frecuenciaConsulta,
      "Notas": item.notas || ""
    }));

    // 3. Crear el Libro de Excel
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(fuidData);

    // Ajustar anchos de columna (opcional pero recomendado para que se vea bien)
    const wscols = [
      {wch: 10}, // No. Orden
      {wch: 15}, // Código
      {wch: 50}, // Asunto
      {wch: 15}, // Fecha I
      {wch: 15}, // Fecha F
      {wch: 15}, // Unidad
      {wch: 10}, // Caja
      {wch: 10}, // Carpeta
      {wch: 10}, // Tomo
      {wch: 10}, // Folios
      {wch: 15}, // Soporte
      {wch: 15}, // Frecuencia
      {wch: 30}  // Notas
    ];
    ws['!cols'] = wscols;

    xlsx.utils.book_append_sheet(wb, ws, "FUID");

    // 4. Generar Buffer y Enviar
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="FUID_Oficial.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    
    res.send(buffer);

  } catch (error) {
    console.error("Error exportando FUID:", error);
    res.status(500).json({ error: "Error al generar el archivo Excel" });
  }
});

module.exports = router;
