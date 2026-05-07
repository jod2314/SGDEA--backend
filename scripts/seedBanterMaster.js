const mongoose = require('mongoose');
const BanterMaster = require('../schema/banterMaster');
require('dotenv').config({ path: './backend/.env' });

const banterData = [
  // SERIES MISIONALES / TRANSVERSALES
  {
    nivel: 'SERIE',
    codigo: '01',
    nombre: 'ACCIONES CONSTITUCIONALES',
    definicion: 'Serie documental en la que se agrupan los instrumentos y mecanismos constitucionales que tienen por objeto proteger, respetar y garantizar los derechos del individuo y de una colectividad.',
    tiposDocumentales: ['Notificación', 'Acción (Demanda)', 'Poder', 'Fallo de primera instancia', 'Recurso de apelación'],
    retencionGestion: 5,
    retencionCentral: 10,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SUBSERIE',
    codigo: '01.01',
    nombre: 'Acciones de Cumplimiento',
    seriePadreCodigo: '01',
    definicion: 'Mecanismo para asegurar la efectividad de las normas.',
    tiposDocumentales: ['Demanda', 'Auto admisorio', 'Sentencia'],
    retencionGestion: 5,
    retencionCentral: 10,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SUBSERIE',
    codigo: '01.02',
    nombre: 'Acciones de Grupo',
    seriePadreCodigo: '01',
    definicion: 'Acciones interpuestas por un número plural de personas que reúnen condiciones uniformes respecto de una misma causa que les originó perjuicios individuales.',
    tiposDocumentales: ['Notificación', 'Poder', 'Fallo'],
    retencionGestion: 5,
    retencionCentral: 10,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SERIE',
    codigo: '02',
    nombre: 'ACTAS',
    definicion: 'Documento escrito de lo tratado o acordado en una junta o reunión o que atestigua un acontecimiento con temas referentes a las funciones de la Unidad.',
    tiposDocumentales: ['Acta de reunión', 'Listado de asistencia'],
    retencionGestion: 2,
    retencionCentral: 18,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SUBSERIE',
    codigo: '02.01',
    nombre: 'Actas de Comité Directivo',
    seriePadreCodigo: '02',
    definicion: 'Evidencia las decisiones tomadas en el Comité Directivo.',
    tiposDocumentales: ['Acta', 'Anexos'],
    retencionGestion: 2,
    retencionCentral: 18,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SERIE',
    codigo: '03',
    nombre: 'ACTOS ADMINISTRATIVOS',
    definicion: 'Todo acto dictado por la administración en el ejercicio de una potestad administrativa.',
    tiposDocumentales: ['Resolución', 'Circular', 'Directiva'],
    retencionGestion: 2,
    retencionCentral: 18,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SERIE',
    codigo: '08',
    nombre: 'CONTRATOS',
    definicion: 'Actos jurídicos generadores de obligaciones que celebren las entidades.',
    tiposDocumentales: ['Estudio previo', 'Contrato', 'Poliza', 'Informe de supervisión', 'Acta de liquidación'],
    retencionGestion: 5,
    retencionCentral: 15,
    disposicionFinal: 'Selección'
  },
  {
    nivel: 'SERIE',
    codigo: '11',
    nombre: 'HISTORIAS LABORALES',
    definicion: 'Serie de manejo y acceso reservado donde se conservan cronológicamente los documentos del vínculo laboral del funcionario.',
    tiposDocumentales: ['Hoja de vida', 'Diploma', 'Acta de posesión', 'Resolución de nombramiento'],
    retencionGestion: 5,
    retencionCentral: 75,
    disposicionFinal: 'Conservación Total'
  },
  {
    nivel: 'SERIE',
    codigo: '12',
    nombre: 'INFORMES',
    definicion: 'Documento que contiene las conclusiones obtenidas al examinar aspectos financieros, económicos o administrativos.',
    tiposDocumentales: ['Informe de gestión', 'Informe de ley', 'Estadísticas'],
    retencionGestion: 2,
    retencionCentral: 8,
    disposicionFinal: 'Selección'
  }
];

async function seedBanter() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('Conectado a MongoDB...');

    // Limpiar catálogo previo para evitar duplicados en el máster
    await BanterMaster.deleteMany({});
    console.log('Catálogo maestro BANTER limpiado.');

    await BanterMaster.insertMany(banterData);
    console.log(`Se han cargado ${banterData.length} entradas al BANTER Maestro.`);

    await mongoose.disconnect();
    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error en seeding:', error);
    process.exit(1);
  }
}

seedBanter();
