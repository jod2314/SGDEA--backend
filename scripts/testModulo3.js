const axios = require('axios');
const mongoose = require('mongoose');
const ConsecutivoConfig = require('../schema/consecutivos/ConsecutivoConfig');
require('dotenv').config();

async function testModulo3() {
  console.log('🚀 Iniciando Validación de Módulo 3 (Consecutivos Atómicos)...');
  
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB para pruebas directas');
    
    const empresaId = new mongoose.Types.ObjectId();
    const usuarioId = new mongoose.Types.ObjectId();
    const codigoPrueba = 'TEST_CONC';

    await ConsecutivoConfig.findOneAndUpdate(
      { codigo: codigoPrueba, empresaId },
      { 
        nombre: 'Prueba Concurrencia', 
        mascara: 'TEST-{YYYY}-{SEQ:4}', 
        reglaReinicio: 'CONTINUO',
        ultimoValor: 0
      },
      { upsert: true, new: true }
    );
    console.log('✅ Configuración de prueba creada.');

    const { emitirRadicadoAtomico } = require('../services/radicacionService');
    const numPeticiones = 20; // Reducido para no saturar el pool de mongoose
    console.log(`⏱️  Ejecutando ${numPeticiones} peticiones concurrentes a la base de datos...`);
    
    // Para probar atomicidad real en Mongoose sin transacciones explícitas, 
    // findOneAndUpdate es atómico a nivel de documento.
    const promesas = [];
    for (let i = 0; i < numPeticiones; i++) {
      // Pequeño jitter para simular tráfico real y no ahogar el pool
      promesas.push(
        new Promise(resolve => setTimeout(resolve, Math.random() * 50))
          .then(() => emitirRadicadoAtomico(codigoPrueba, empresaId, usuarioId))
      );
    }

    const resultados = await Promise.all(promesas);
    
    const valoresUnicos = new Set(resultados);
    console.log(`✅ Se generaron ${resultados.length} radicados.`);
    console.log(`✅ Número de radicados únicos: ${valoresUnicos.size}`);

    if (resultados.length === valoresUnicos.size) {
      console.log('🎉 PRUEBA DE CONCURRENCIA SUPERADA: No se generaron radicados duplicados.');
      // Ordenar para mostrar los primeros y últimos
      resultados.sort();
      console.log('Ejemplos generados:', resultados.slice(0, 3).join(', '), '...', resultados[resultados.length - 1]);
    } else {
      console.error('❌ FALLO CRÍTICO: Se detectaron condiciones de carrera (duplicados).');
    }

    // Limpieza
    await ConsecutivoConfig.deleteOne({ codigo: codigoPrueba, empresaId });
    await mongoose.model('ConsecutivoLog').deleteMany({ empresaId });
    
  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    // Pequeña pausa antes de desconectar para que se completen los logs de auditoría asíncronos
    setTimeout(async () => {
      await mongoose.disconnect();
    }, 1000);
  }
}

testModulo3();
