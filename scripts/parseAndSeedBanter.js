const fs = require('fs');
const mongoose = require('mongoose');
const BanterMaster = require('../schema/banterMaster');
require('dotenv').config({ path: '.env' });

function parsePdfText() {
  const lines = fs.readFileSync('banter_text_dump.txt', 'utf-8').split('\n').map(l => l.trim());

  let currentItem = null;
  const items = [];
  let state = 'WAITING_FOR_1_2';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detectar nueva sección de Título
    if (line.startsWith('1.2 Título')) {
      if (currentItem && currentItem.titulo) items.push(currentItem);
      
      let title = line.replace('1.2 Título', '').replace(/^-?\s*(Serie\s+)?/i, '').trim();
      if (!title) {
        title = lines[i+1].replace(/^-?\s*(Serie\s+)?/i, '').trim();
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
    if (line.startsWith('4 ÁREA') || line === '4' || line.startsWith('4.1')) {
      state = 'DONE';
      continue;
    }
    
    if (state === 'WAITING_FOR_NIVEL') {
      if (!['Nivel de', 'Descripción', 'Subserie'].includes(line)) {
        if (line.toUpperCase() === 'SERIE' || line.toUpperCase() === 'SUBSERIE') {
          currentItem.nivel = line.toUpperCase();
        } else if (line.toUpperCase().includes('SERIE')) {
          currentItem.nivel = 'SERIE';
        } else if (line.toUpperCase().includes('SUBSERIE')) {
          currentItem.nivel = 'SUBSERIE';
        }
      }
    } else if (state === 'WAITING_FOR_ALCANCE') {
      if (!['Alcance y', 'Contenido'].includes(line) && !line.startsWith('2.2') && !line.startsWith('2.3')) {
        currentItem.alcance.push(line);
      }
    } else if (state === 'WAITING_FOR_TIPOS') {
      if (!['Tipos', 'documentales'].includes(line) && !line.startsWith('3') && !line.startsWith('2.3')) {
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

async function run() {
  console.log("Iniciando parseo del PDF...");
  const rawItems = parsePdfText();
  
  // Limpiar y procesar items
  let dbItems = [];
  let serieCounter = 1;
  let subserieCounter = 1;
  let currentSerieCode = null;

  for (const item of rawItems) {
    if (item.titulo.length < 3 || item.titulo.includes('CONTENIDO')) continue;

    let retCentral = 0;
    const tiempoStr = item.tiempo.join(' ').toLowerCase();
    const match = tiempoStr.match(/(\d+)\s+años?/);
    if (match) {
      retCentral = parseInt(match[1]);
    }

    let disp = 'Conservación Total';
    const dispStr = item.disposicion.join(' ').toLowerCase();
    if (dispStr.includes('eliminaci')) disp = 'Eliminación';
    else if (dispStr.includes('selecci')) disp = 'Selección';
    else if (dispStr.includes('medio') || dispStr.includes('técni')) disp = 'Medio Técnico';

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

    dbItems.push({
      nivel,
      codigo,
      nombre: item.titulo.toUpperCase(),
      definicion: item.alcance.join(' ').substring(0, 500),
      tiposDocumentales: item.tipos.filter(t => t.length > 3),
      retencionGestion: Math.max(1, Math.floor(retCentral * 0.2)), // Aproximación lógica
      retencionCentral: retCentral,
      disposicionFinal: disp,
      seriePadreCodigo: nivel === 'SUBSERIE' ? currentSerieCode : undefined
    });
  }

  // Quitar duplicados por nombre
  dbItems = dbItems.filter((item, index, self) => 
    index === self.findIndex((t) => t.nombre === item.nombre)
  );

  console.log(`Se identificaron ${dbItems.length} entidades únicas (Series y Subseries).`);

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('Conectado a MongoDB...');

    await BanterMaster.deleteMany({});
    await BanterMaster.insertMany(dbItems);
    
    console.log('Carga masiva completada con éxito.');
  } catch (error) {
    console.error('Error insertando en la BD:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
