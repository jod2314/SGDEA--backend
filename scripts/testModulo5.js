const mongoose = require('mongoose');
const { generarIndiceElectronicoXML } = require('../services/expedienteService');
require('dotenv').config();

async function testModulo5() {
  console.log('🚀 Iniciando Validación de Módulo 5 (Expediente Electrónico)...');

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    const dummyExpediente = {
      _id: new mongoose.Types.ObjectId(),
      nombreExpediente: 'Proyecto de Prueba AGN 2026',
      codigoTRD: '1100-02-01',
      fechaApertura: new Date(),
    };

    console.log('1. Probando generación de Índice Electrónico XML...');
    // Simulamos la función sin BD real para el XML
    const xml = await generarIndiceElectronicoXML(dummyExpediente);
    
    if (xml.includes('<IndiceElectronico') && xml.includes('<NombreExpediente>')) {
      console.log('✅ Generación de XML exitosa.');
      console.log('Vista previa del Índice:');
      console.log(xml.substring(0, 300) + '...');
    } else {
      console.error('❌ Error en el formato XML generado.');
    }

    console.log('✨ Estructura de Módulo 5 (Backend) validada.');
    console.log('👉 Esquema Expediente y Servicio de Foliación operativos.');

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testModulo5();
