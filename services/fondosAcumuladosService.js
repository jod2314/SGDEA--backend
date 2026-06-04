const xlsx = require("xlsx");
const FondoAcumulado = require("../schema/fondoAcumulado");

/**
 * Servicio para procesar y validar la carga masiva de fondos acumulados (FUID).
 * 
 * @param {Buffer} fileBuffer - Buffer del archivo subido (Excel/CSV).
 * @param {string} empresaId - ID de la empresa en contexto.
 * @returns {Promise<object>} Reporte del proceso con registros guardados e incidencias.
 */
async function procesarFuidMasivo(fileBuffer, empresaId) {
  // Parsear el archivo con xlsx (soporta XLSX, XLS y CSV de forma nativa)
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir la hoja a JSON. raw: false para forzar strings y formateo básico
  const filas = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

  if (filas.length === 0) {
    throw new Error("El archivo está vacío o no contiene filas válidas");
  }

  const errores = [];
  const validos = [];
  
  // Obtener los códigos de inventario existentes para esta empresa para validar duplicados
  const existentes = await FondoAcumulado.find({ empresaId }, "codigoInventario");
  const codigosExistentes = new Set(existentes.map(e => e.codigoInventario.trim().toLowerCase()));

  for (let index = 0; index < filas.length; index++) {
    const fila = filas[index];
    const numeroFila = index + 2; // Fila 1 es la cabecera en Excel

    // Mapear los nombres de columna tolerando tildes, mayúsculas y minúsculas
    const getVal = (clavesSugeridas) => {
      for (const clave of clavesSugeridas) {
        const match = Object.keys(fila).find(k => k.trim().toLowerCase().replace(/[áéíóú]/g, (m) => {
          if (m === 'á') return 'a';
          if (m === 'é') return 'e';
          if (m === 'í') return 'i';
          if (m === 'ó') return 'o';
          if (m === 'ú') return 'u';
          return m;
        }) === clave.toLowerCase());
        if (match) return fila[match].toString().trim();
      }
      return "";
    };

    const codigoInventario = getVal(["Codigo Inventario", "codigo", "codigo_inventario"]);
    const seccion = getVal(["Seccion", "seccion", "seccion_productora"]);
    const subseccion = getVal(["Subseccion", "subseccion"]);
    const asunto = getVal(["Asunto / Serie", "asunto", "asunto_serie", "serie"]);
    const fechaIniRaw = getVal(["Fecha Inicial", "fecha_inicial", "inicial"]);
    const fechaFinRaw = getVal(["Fecha Final", "fecha_final", "final"]);
    const soporteRaw = getVal(["Soporte", "soporte_conservacion", "soporte"]).toUpperCase();
    const cajasRaw = getVal(["Cajas", "cajas", "volumen_cajas"]);
    const carpetasRaw = getVal(["Carpetas", "carpetas", "volumen_carpetas"]);
    const foliosRaw = getVal(["Folios", "folios", "volumen_folios"]);
    const estadoConservacionRaw = getVal(["Estado de Conservacion", "estado_conservacion", "estado", "conservacion"]).toUpperCase();

    const erroresFila = [];

    // Validaciones de obligatoriedad
    if (!codigoInventario) {
      erroresFila.push("El campo 'Codigo Inventario' es obligatorio.");
    } else if (codigosExistentes.has(codigoInventario.toLowerCase())) {
      erroresFila.push(`El código de inventario '${codigoInventario}' ya existe en la empresa.`);
    }

    if (!seccion) {
      erroresFila.push("El campo 'Seccion' es obligatorio.");
    }

    if (!asunto) {
      erroresFila.push("El campo 'Asunto / Serie' es obligatorio.");
    }

    // Validar Soporte (Enum)
    let soporte = "FISICO";
    if (soporteRaw) {
      if (["FISICO", "DIGITAL", "AMBOS"].includes(soporteRaw)) {
        soporte = soporteRaw;
      } else {
        erroresFila.push(`Soporte '${soporteRaw}' no válido. Valores permitidos: FISICO, DIGITAL, AMBOS.`);
      }
    }

    // Validar Estado de Conservación (Enum)
    let estadoConservacion = "BUENO";
    if (estadoConservacionRaw) {
      if (["BUENO", "REGULAR", "MALO"].includes(estadoConservacionRaw)) {
        estadoConservacion = estadoConservacionRaw;
      } else {
        erroresFila.push(`Estado de conservación '${estadoConservacionRaw}' no válido. Valores permitidos: BUENO, REGULAR, MALO.`);
      }
    }

    // Validar y parsear volúmenes numéricos
    const cajas = parseInt(cajasRaw) || 0;
    const carpetas = parseInt(carpetasRaw) || 0;
    const folios = parseInt(foliosRaw) || 0;

    if (cajasRaw && isNaN(parseInt(cajasRaw))) {
      erroresFila.push("Cajas debe ser un valor numérico.");
    }
    if (carpetasRaw && isNaN(parseInt(carpetasRaw))) {
      erroresFila.push("Carpetas debe ser un valor numérico.");
    }
    if (foliosRaw && isNaN(parseInt(foliosRaw))) {
      erroresFila.push("Folios debe ser un valor numérico.");
    }

    // Validar y formatear fechas extremas
    let fechaInicial = null;
    let fechaFinal = null;

    if (fechaIniRaw) {
      const d = new Date(fechaIniRaw);
      if (isNaN(d.getTime())) {
        erroresFila.push(`Fecha Inicial '${fechaIniRaw}' no es válida (Formato sugerido: AAAA-MM-DD).`);
      } else {
        fechaInicial = d;
      }
    }

    if (fechaFinRaw) {
      const d = new Date(fechaFinRaw);
      if (isNaN(d.getTime())) {
        erroresFila.push(`Fecha Final '${fechaFinRaw}' no es válida (Formato sugerido: AAAA-MM-DD).`);
      } else {
        fechaFinal = d;
      }
    }

    if (fechaInicial && fechaFinal && fechaInicial > fechaFinal) {
      erroresFila.push("La Fecha Inicial no puede ser posterior a la Fecha Final.");
    }

    // Reportar errores o agrupar para inserción
    if (erroresFila.length > 0) {
      errores.push({
        fila: numeroFila,
        codigo: codigoInventario || `Fila ${numeroFila}`,
        mensajes: erroresFila
      });
    } else {
      validos.push({
        empresaId,
        codigoInventario,
        seccion,
        subseccion: subseccion || undefined,
        asunto,
        fechasExtremas: {
          inicial: fechaInicial || undefined,
          final: fechaFinal || undefined
        },
        soporte,
        volumen: { cajas, carpetas, folios },
        estadoConservacion
      });
      // Registrar el código localmente para evitar duplicados en el mismo archivo
      codigosExistentes.add(codigoInventario.toLowerCase());
    }
  }

  // Insertar registros válidos
  let guardados = 0;
  if (validos.length > 0) {
    await FondoAcumulado.insertMany(validos);
    guardados = validos.length;
  }

  return {
    totalProcesados: filas.length,
    totalGuardados: guardados,
    errores
  };
}

/**
 * Servicio para exportar el inventario FUID de fondos acumulados a formato CSV.
 * 
 * @param {string} empresaId - ID de la empresa en contexto.
 * @returns {Promise<string>} Contenido CSV formateado con BOM.
 */
async function exportarFuidCsv(empresaId) {
  const fondos = await FondoAcumulado.find({ empresaId }).sort({ codigoInventario: 1 });

  // Cabecera oficial del FUID simplificado para CSV
  let csvContent = "\uFEFF"; // BOM para soportar tildes en Excel
  csvContent += "Codigo Inventario,Seccion,Subseccion,Asunto / Serie,Fecha Inicial,Fecha Final,Soporte,Cajas,Carpetas,Folios,Estado de Conservacion\n";

  fondos.forEach(f => {
    const fechaIni = f.fechasExtremas?.inicial ? new Date(f.fechasExtremas.inicial).toISOString().split('T')[0] : "";
    const fechaFin = f.fechasExtremas?.final ? new Date(f.fechasExtremas.final).toISOString().split('T')[0] : "";
    
    // Escapar caracteres especiales en formato CSV
    const escape = (text) => {
      if (!text) return "";
      const formatted = text.replace(/"/g, '""');
      return formatted.includes(',') || formatted.includes('\n') ? `"${formatted}"` : formatted;
    };

    csvContent += `${escape(f.codigoInventario)},${escape(f.seccion)},${escape(f.subseccion)},${escape(f.asunto)},${fechaIni},${fechaFin},${f.soporte || "FISICO"},${f.volumen?.cajas || 0},${f.volumen?.carpetas || 0},${f.volumen?.folios || 0},${f.estadoConservacion || "BUENO"}\n`;
  });

  return csvContent;
}

module.exports = {
  procesarFuidMasivo,
  exportarFuidCsv
};

