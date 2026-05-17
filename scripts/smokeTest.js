const axios = require('axios');

async function smokeTest() {
  console.log('🚀 Iniciando Smoke Test del Backend...');
  const baseURL = 'http://localhost:3000/api';

  try {
    const response = await axios.get(`${baseURL}/test`);
    console.log('✅ El backend respondió correctamente:', response.data);
    
    console.log('🔍 Verificando protección de rutas operativas...');
    try {
      await axios.get(`${baseURL}/archivistica`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Ruta /archivistica protegida con 401 (Unauthorized) como se esperaba.');
      } else {
        console.log('❌ Comportamiento inesperado en /archivistica:', error.response?.status);
      }
    }
    
    console.log('✨ Smoke Test finalizado con éxito.');
  } catch (error) {
    console.error('❌ Falló el Smoke Test:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('👉 Asegúrate de que el servidor esté corriendo (npm run dev)');
    }
  }
}

smokeTest();
