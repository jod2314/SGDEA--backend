const fs = require('fs');
const path = require('path');

function toSimpleText(text) {
  if (!text) return "";
  
  // 1. Corregir Mojibake común antes de normalizar
  // (Intentar arreglar secuencias UTF-8 rotas que se ven como Ã³, Ã¡, etc.)
  let fixedText = text
    .replace(/Ã¡/g, 'a').replace(/Ã©/g, 'e').replace(/Ã/g, 'i').replace(/Ã³/g, 'o').replace(/Ãº/g, 'u')
    .replace(/Ã‘/g, 'N').replace(/Ã±/g, 'n')
    .replace(/Â/g, '');

  // 2. Normalizar y eliminar acentos (NFD descompone caracteres acentuados)
  return fixedText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
    .replace(/[^\x00-\x7F]/g, "")    // Eliminar cualquier cosa que no sea ASCII puro
    .replace(/\s+/g, ' ')           // Normalizar espacios
    .trim();
}

function cleanCsv() {
  const csvPath = path.join(__dirname, '..', '..', 'documentos apoyo', 'BANTER_Series_Subseries.csv');
  if (!fs.existsSync(csvPath)) return;

  let content = fs.readFileSync(csvPath, 'utf-8');
  let lines = content.split('\n');
  let header = lines[0];
  let rows = lines.slice(1);

  let cleanedRows = [];

  for (let row of rows) {
    if (!row.trim()) continue;

    // Separar por ; asegurando no romper los campos citados
    const parts = row.split(';');
    
    const simpleParts = parts.map(part => {
      let isQuoted = part.startsWith('"') && part.endsWith('"');
      let inner = isQuoted ? part.slice(1, -1) : part;
      
      let simple = toSimpleText(inner);
      
      return isQuoted ? `"${simple}"` : simple;
    });

    cleanedRows.push(simpleParts.join(';'));
  }

  // Escribir el archivo final
  fs.writeFileSync(csvPath, header + '\n' + cleanedRows.join('\n'), 'utf-8');
  console.log(`Conversion a ASCII puro completada. Se procesaron ${cleanedRows.length} registros.`);
}

cleanCsv();
