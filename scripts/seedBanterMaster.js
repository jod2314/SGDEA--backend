const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const BanterMaster = require('../schema/banterMaster');
require('dotenv').config();

async function seedBanter() {
  console.log('🚀 Iniciando carga masiva de BANTER Master...');
  
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('✅ Conectado a MongoDB');

    // Limpiar catálogo actual (opcional, dependiendo de si quieres refrescar)
    // await BanterMaster.deleteMany({});
    // console.log('🗑️ Catálogo previo limpiado');

    const results = [];
    const csvPath = path.join(__dirname, '../../documentos apoyo/BANTER_Series_Subseries.csv');

    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => {
        // Mapear datos del CSV al esquema BanterMaster
        results.push({
          nivel: data.NIVEL,
          codigo: data.CODIGO,
          nombre: data.NOMBRE,
          definicion: data.DEFINICION,
          tiposDocumentales: data.TIPOS_DOCUMENTALES ? data.TIPOS_DOCUMENTALES.split(',').map(t => t.trim()) : [],
          retencionGestion: parseInt(data.RETENCION_GESTION) || 0,
          retencionCentral: parseInt(data.RETENCION_CENTRAL) || 0,
          disposicionFinal: data.DISPOSICION_FINAL || 'Conservación Total',
          seriePadreCodigo: data.NIVEL === 'SUBSERIE' ? data.CODIGO.split('.')[0] : null,
          transversal: true
        });
      })
      .on('end', async () => {
        console.log(`📦 Procesados ${results.length} registros del CSV. Insertando en BD...`);
        
        // Insertar uno por uno para manejar duplicados o errores de validación si es necesario,
        // o usar insertMany para velocidad.
        try {
          // Usamos upsert basado en código para evitar duplicados si se corre varias veces
          for (const item of results) {
            await BanterMaster.findOneAndUpdate(
              { codigo: item.codigo, nivel: item.nivel },
              item,
              { upsert: true, new: true }
            );
          }
          console.log('✨ Carga de BANTER Master finalizada con éxito.');
        } catch (error) {
          console.error('❌ Error al insertar registros:', error);
        } finally {
          mongoose.connection.close();
        }
      });

  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

seedBanter();
