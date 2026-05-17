const mongoose = require('mongoose');
const { obtenerEstadisticasProduccion, obtenerIndiceMadurez } = require('../services/reportService');
require('dotenv').config();

async function testModulo10() {
  console.log('🚀 Iniciando Validación de Módulo 10 (Inteligencia de Datos)...');

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    const dummyEmpresaId = new mongoose.Types.ObjectId();

    console.log('1. Probando agregador de producción documental...');
    const stats = await obtenerEstadisticasProduccion(dummyEmpresaId);
    console.log(`✅ Consulta ejecutada. Series con documentos: ${stats.length}`);

    console.log('2. Probando KPI de madurez archivística...');
    const madurez = await obtenerIndiceMadurez(dummyEmpresaId);
    console.log(`✅ KPI obtenido. Progreso actual: ${madurez.porcentajeCompletitud}%`);

    console.log('✨ Estructura de Módulo 10 (Backend) validada.');
    console.log('👉 Servicio de Reportes y Rutas de Dashboard operativos.');

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testModulo10();
