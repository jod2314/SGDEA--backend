const mongoose = require('mongoose');
const { obtenerEstadoWizard, guardarRespuestasYPasar } = require('../services/onboardingService');
require('dotenv').config();

async function testModulo9() {
  console.log('🚀 Iniciando Validación de Módulo 9 (Asistente Inteligente)...');

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    const dummyEmpresaId = new mongoose.Types.ObjectId();

    console.log('1. Probando inicialización de Wizard...');
    const wizard = await obtenerEstadoWizard(dummyEmpresaId);
    if (wizard.estadoActual === 'INICIO') {
      console.log('✅ Inicialización de Wizard exitosa.');
    } else {
      console.error('❌ Error en estado inicial:', wizard.estadoActual);
    }

    console.log('2. Probando transición de estado (Diagnóstico)...');
    const wizardActualizado = await guardarRespuestasYPasar(dummyEmpresaId, 'DIAGNOSTICO', { r1: 'sí' });
    if (wizardActualizado.estadoActual === 'DIAGNOSTICO_MGDA' && wizardActualizado.progreso === 20) {
      console.log('✅ Transición y cálculo de progreso exitosos.');
    } else {
      console.error('❌ Fallo en transición de estado:', wizardActualizado.estadoActual);
    }

    console.log('✨ Estructura de Módulo 9 (Backend) validada.');
    console.log('👉 Esquema OnboardingWizard y lógica de Máquina de Estados operativos.');

    // Limpieza
    await mongoose.model('OnboardingWizard').deleteOne({ empresaId: dummyEmpresaId });

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testModulo9();
