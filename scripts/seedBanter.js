const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const Dependencia = require('../schema/dependencia');
const SerieDocumental = require('../schema/serieDocumental');
const SubserieDocumental = require('../schema/subserieDocumental');

const dependenciasBanter = [
  { codigo: '100', nombre: 'DIRECCIÓN GENERAL' },
  { codigo: '110', nombre: 'OFICINA ASESORA DE COMUNICACIONES' },
  { codigo: '120', nombre: 'OFICINA DE CONTROL INTERNO' },
  { codigo: '130', nombre: 'OFICINA ASESORA DE PLANEACIÓN' },
  { codigo: '140', nombre: 'OFICINA DE TECNOLOGÍAS DE LA INFORMACIÓN' },
  { codigo: '150', nombre: 'OFICINA ASESORA JURÍDICA' },
  { codigo: '160', nombre: 'SECRETARÍA GENERAL' },
];

const seriesBanter = [
  { 
    codigo: '01', 
    nombre: 'ACCIONES CONSTITUCIONALES',
    subseries: [
      { codigo: '01', nombre: 'Acciones de Cumplimiento' },
      { codigo: '02', nombre: 'Acciones de Grupo' },
      { codigo: '03', nombre: 'Acciones Populares' },
      { codigo: '04', nombre: 'Acciones de Tutela' },
    ]
  },
  { 
    codigo: '02', 
    nombre: 'ACTAS',
    subseries: [
      { codigo: '01', nombre: 'Actas de Comité Directivo' },
      { codigo: '02', nombre: 'Actas de Comité de Contratación' },
    ]
  },
  { 
    codigo: '03', 
    nombre: 'ACTOS ADMINISTRATIVOS',
    subseries: [
      { codigo: '01', nombre: 'Resoluciones' },
      { codigo: '02', nombre: 'Circulares' },
    ]
  },
];

async function seed(empresaId) {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('Conectado a la base de datos para el seeding...');

    if (!empresaId) {
       console.error('Se requiere un ID de empresa para asociar los datos del BANTER.');
       process.exit(1);
    }

    // Insertar Dependencias
    for (const dep of dependenciasBanter) {
      await Dependencia.findOneAndUpdate(
        { empresaId, codigoDependencia: dep.codigo },
        { nombreDependencia: dep.nombre, estado: 'activo' },
        { upsert: true, new: true }
      );
    }
    console.log('Dependencias BANTER cargadas.');

    // Insertar Series y Subseries
    for (const ser of seriesBanter) {
      const serieDoc = await SerieDocumental.findOneAndUpdate(
        { empresaId, codigoSerie: ser.codigo },
        { nombreSerie: ser.nombre, origen: 'BANTER' },
        { upsert: true, new: true }
      );

      for (const sub of ser.subseries) {
        await SubserieDocumental.findOneAndUpdate(
          { serieId: serieDoc._id, codigoSubserie: sub.codigo },
          { nombreSubserie: sub.nombre },
          { upsert: true, new: true }
        );
      }
    }
    console.log('Series y Subseries BANTER cargadas.');

    await mongoose.disconnect();
    console.log('Seeding completado con éxito.');
  } catch (error) {
    console.error('Error durante el seeding:', error);
    process.exit(1);
  }
}

// Para ejecutar desde la línea de comandos: node backend/scripts/seedBanter.js <empresaId>
const empresaId = process.argv[2];
seed(empresaId);
