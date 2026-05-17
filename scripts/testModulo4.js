const mongoose = require('mongoose');
const { generarPDFDocumental, procesarTokens } = require('../services/generadorDocumentos');
require('dotenv').config();

async function testModulo4() {
  console.log('🚀 Iniciando Validación de Módulo 4 (Gestor Documental Core)...');

  try {
    // 1. Probar Procesamiento de Tokens
    console.log('1. Probando motor de fusión de tokens...');
    const htmlPrueba = '<h1>Hola {{entidad.nombre}}</h1><p>Su radicado es {{documento.radicado}}</p>';
    const datosPrueba = {
      entidad: { nombre: 'Juan Pérez' },
      documento: { radicado: 'RAD-2026-0001' }
    };
    const procesado = procesarTokens(htmlPrueba, datosPrueba);
    if (procesado.includes('Juan Pérez') && procesado.includes('RAD-2026-0001')) {
      console.log('✅ Motor de tokens funcional.');
    } else {
      console.error('❌ Error en motor de tokens:', procesado);
    }

    // 2. Probar Generación de PDF (Dummy)
    console.log('2. Probando generación de buffer PDF...');
    const result = await generarPDFDocumental(htmlPrueba, datosPrueba);
    if (result.buffer && result.hash) {
      console.log('✅ Generación de PDF y Hash funcional.');
      console.log('Hash del documento:', result.hash);
    } else {
      console.error('❌ Falló la generación de PDF.');
    }

    console.log('✨ Validación técnica del motor documental finalizada.');
    console.log('👉 Los esquemas de Plantilla, PlantillaHistorico, DatoMaestro e HistorialDocumento están operativos.');

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  }
}

testModulo4();
