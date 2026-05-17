const axios = require('axios');

async function testModulo1() {
  console.log('🚀 Iniciando Validación de Módulo 1 (CCD y BANTER)...');
  const baseURL = 'http://localhost:3000/api';
  
  // En un entorno real, necesitaríamos un token válido y una empresaId.
  // Para este test, asumimos que el desarrollador proporciona estos datos o usamos un mock.
  // Como no tengo un flujo de login automatizado aquí, voy a verificar la existencia de los endpoints.
  
  try {
    console.log('1. Verificando búsqueda en BANTER...');
    const resBanter = await axios.get(`${baseURL}/archivistica/banter/buscar?q=ACTAS`);
    if (resBanter.status === 200 && resBanter.data.body.sugerencias.length > 0) {
      console.log('✅ Búsqueda en BANTER funcional.');
    } else {
      console.log('❌ Error en búsqueda BANTER:', resBanter.data);
    }

    console.log('2. Verificando listado de dependencias (requiere auth)...');
    try {
      await axios.get(`${baseURL}/archivistica/dependencias`);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 400) {
        console.log('✅ Endpoints protegidos correctamente.');
      }
    }

    console.log('✨ Validación básica finalizada.');
    console.log('👉 Para pruebas completas, use Postman con un token de sesión activo.');
  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  }
}

testModulo1();
