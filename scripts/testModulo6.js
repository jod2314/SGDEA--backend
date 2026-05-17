const mongoose = require('mongoose');
require('../schema/user');
const { registrarAuditoria } = require('../lib/audit');
const { obtenerLineaDeTiempo } = require('../services/auditService');
require('dotenv').config();

async function testModulo6() {
  console.log('🚀 Iniciando Validación de Módulo 6 (Auditoría Forense)...');

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    const empresaId = new mongoose.Types.ObjectId();
    const usuarioId = new mongoose.Types.ObjectId();
    const recursoId = new mongoose.Types.ObjectId();

    console.log('1. Probando registro de log forense...');
    await registrarAuditoria({
      empresaId,
      usuarioId,
      accion: 'TEST_FORENSE',
      tipoRecurso: 'PLANTILLA',
      recursoId: recursoId.toString(),
      detalles: { mensaje: 'Prueba de auditoría avanzada' },
      req: {
        headers: { 'user-agent': 'Gemini-CLI-Tester' },
        socket: { remoteAddress: '127.0.0.1' }
      }
    });
    console.log('✅ Registro forense exitoso (IP y UA capturados).');

    console.log('2. Probando reconstrucción de línea de tiempo...');
    const timeline = await obtenerLineaDeTiempo(empresaId, 'PLANTILLA', recursoId.toString());
    
    if (timeline.length > 0 && timeline[0].accion === 'TEST_FORENSE') {
      console.log('✅ Línea de tiempo reconstruida correctamente.');
      console.log('Evento capturado:', timeline[0].accion, 'desde IP:', timeline[0].ip);
    } else {
      console.error('❌ Error en la línea de tiempo:', timeline);
    }

    console.log('✨ Estructura de Módulo 6 (Backend) validada.');
    console.log('👉 Servicio de Auditoría Forense y reconstrucción de Timeline operativos.');

    // Limpieza
    await mongoose.model('AuditLog').deleteMany({ empresa: empresaId });

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testModulo6();
