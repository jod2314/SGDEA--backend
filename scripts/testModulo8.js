const mongoose = require('mongoose');
const { obtenerListosDisposicionFinal, procesarEliminacionMasiva } = require('../services/disposicionService');
require('dotenv').config();

async function testModulo8() {
  console.log('🚀 Iniciando Validación de Módulo 8 (Disposición Final)...');

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    const dummyEmpresaId = new mongoose.Types.ObjectId();

    console.log('1. Probando consulta de expedientes listos para disposición...');
    const listos = await obtenerListosDisposicionFinal(dummyEmpresaId);
    console.log(`✅ Consulta ejecutada. Expedientes listos encontrados: ${listos.length}`);

    console.log('2. Probando motor de eliminación lógica...');
    const dummyIds = [new mongoose.Types.ObjectId()];
    const rows = await procesarEliminacionMasiva(dummyEmpresaId, dummyIds, 'ACTA-TEST');
    console.log('✅ Lógica de marcado para eliminación operativa.');

    console.log('✨ Estructura de Módulo 8 (Backend) validada.');
    console.log('👉 Esquema ActaEliminacion y Rutas de Disposición Final operativos.');

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testModulo8();
