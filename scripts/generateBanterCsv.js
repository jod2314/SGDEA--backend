const fs = require('fs');
const path = require('path');

function parsePdfText() {
  // Asegurarse de leer el archivo desde el directorio correcto (backend/banter_text_dump.txt)
  const dumpPath = path.join(__dirname, '..', 'banter_text_dump.txt');
  if (!fs.existsSync(dumpPath)) {
    console.error('No se encontró banter_text_dump.txt en la raíz del backend.');
    return [];
  }
  const lines = fs.readFileSync(dumpPath, 'utf-8').split('\n').map(l => l.trim());

  let currentItem = null;
  const items = [];
  let state = 'WAITING_FOR_1_2';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detectar nueva sección de Título (Basado en la estructura del BANTER PDF)
    if (line.startsWith('1.2 Título')) {
      if (currentItem && currentItem.titulo) items.push(currentItem);
      
      let title = line.replace('1.2 Título', '').replace(/^-?\s*(Serie\s+)?/i, '').trim();
      if (!title) {
        title = lines[i+1]?.replace(/^-?\s*(Serie\s+)?/i, '').trim() || '';
      }
      
      currentItem = {
        titulo: title,
        nivel: '',
        alcance: [],
        tipos: [],
        tiempo: [],
        disposicion: []
      };
      state = 'TITLE_FOUND';
      continue;
    }

    if (!currentItem) continue;

    if (line === '1.3' || line.startsWith('1.3 Nivel')) {
      state = 'WAITING_FOR_NIVEL';
      continue;
    }
    if (line === '2.1' || line.startsWith('2.1 Alcance')) {
      state = 'WAITING_FOR_ALCANCE';
      continue;
    }
    if (line === '2.2' || line.startsWith('2.2 Tipos')) {
      state = 'WAITING_FOR_TIPOS';
      continue;
    }
    if (line === '2.3' || line.startsWith('2.3 Subseries')) {
      state = 'WAITING_FOR_SUBSERIES';
      continue;
    }
    if (line === '3.1' || line.startsWith('3.1 Tiempo')) {
      state = 'WAITING_FOR_TIEMPO';
      continue;
    }
    if (line === '3.2' || line.startsWith('3.2 Disposición')) {
      state = 'WAITING_FOR_DISPOSICION';
      continue;
    }
    if (line.startsWith('4 ÁREA')) {
      state = 'DONE';
      continue;
    }
    
    if (state === 'WAITING_FOR_NIVEL') {
      if (line.toUpperCase().includes('SERIE') || line.toUpperCase().includes('SUBSERIE')) {
        currentItem.nivel = line.toUpperCase().includes('SUBSERIE') ? 'SUBSERIE' : 'SERIE';
      }
    } else if (state === 'WAITING_FOR_ALCANCE') {
      if (!['Alcance y', 'Contenido'].includes(line) && !line.startsWith('2.2') && !line.startsWith('2.3')) {
        currentItem.alcance.push(line);
      }
    } else if (state === 'WAITING_FOR_TIPOS') {
      if (!['Tipos', 'documentales'].includes(line) && !line.startsWith('3')) {
        currentItem.tipos.push(line);
      }
    } else if (state === 'WAITING_FOR_TIEMPO') {
      if (!['Tiempo de', 'retención'].includes(line) && !line.startsWith('3.2')) {
        currentItem.tiempo.push(line);
      }
    } else if (state === 'WAITING_FOR_DISPOSICION') {
      if (!['Disposición', 'final'].includes(line) && !line.startsWith('4')) {
        currentItem.disposicion.push(line);
      }
    }
  }
  if (currentItem && currentItem.titulo) items.push(currentItem);

  return items;
}

function run() {
  console.log("Iniciando extracción a CSV...");
  const rawItems = parsePdfText();
  
  // Encabezados del CSV (usando punto y coma como delimitador para evitar conflictos con comas en texto)
  let csvContent = "NIVEL;CODIGO;NOMBRE;DEFINICION;TIPOS_DOCUMENTALES;RETENCION_GESTION;RETENCION_CENTRAL;DISPOSICION_FINAL\n";
  let serieCounter = 1;
  let subserieCounter = 1;
  let currentSerieCode = null;

  const uniqueItems = [];

  for (const item of rawItems) {
    if (item.titulo.length < 3 || item.titulo.includes('CONTENIDO')) continue;
    
    // Evitar duplicados por nombre
    const nombreUpper = item.titulo.toUpperCase();
    if (uniqueItems.some(u => u.nombre === nombreUpper)) continue;

    let retCentral = 0;
    const tiempoStr = item.tiempo.join(' ').toLowerCase();
    const match = tiempoStr.match(/(\d+)\s+años?/);
    if (match) retCentral = parseInt(match[1]);

    let disp = 'Conservación Total';
    const dispStr = item.disposicion.join(' ').toLowerCase();
    if (dispStr.includes('eliminaci')) disp = 'Eliminación';
    else if (dispStr.includes('selecci')) disp = 'Selección';
    else if (dispStr.includes('medio') || dispStr.includes('técni')) disp = 'Medio Técnico';

    // Lógica para determinar nivel si no se detectó bien
    const isSubserie = item.nivel === 'SUBSERIE' || item.titulo.toLowerCase().startsWith('actas de');
    const nivel = isSubserie ? 'SUBSERIE' : 'SERIE';

    let codigo = '';
    if (nivel === 'SERIE') {
      codigo = serieCounter.toString().padStart(2, '0');
      currentSerieCode = codigo;
      serieCounter++;
      subserieCounter = 1;
    } else {
      codigo = `${currentSerieCode || '00'}.${subserieCounter.toString().padStart(2, '0')}`;
      subserieCounter++;
    }

    const definicion = item.alcance.join(' ').replace(/;/g, ',').replace(/"/g, '""').substring(0, 500);
    const tipos = item.tipos.filter(t => t.length > 3).join(', ').replace(/;/g, ',').replace(/"/g, '""');

    const row = [
      nivel,
      codigo,
      `"${nombreUpper}"`,
      `"${definicion}"`,
      `"${tipos}"`,
      Math.max(1, Math.floor(retCentral * 0.2)),
      retCentral,
      disp
    ];

    csvContent += row.join(';') + "\n";
    uniqueItems.push({ nombre: nombreUpper });
  }

  const outputPath = path.join(__dirname, '..', '..', 'documentos apoyo', 'BANTER_Series_Subseries.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`Extracción completada. Archivo creado en: ${outputPath}`);
  console.log(`Total de registros procesados: ${uniqueItems.length}`);
}

run();
