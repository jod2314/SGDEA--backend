const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Empresa = require('../schema/empresa');

async function migrate() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('Conectado a la base de datos para la migración...');

    const empresas = await Empresa.find({ razonSocial: { $exists: false } });
    console.log(`Encontradas ${empresas.length} empresas para migrar.`);

    for (const empresa of empresas) {
      // Usar .set para evitar problemas con campos que no están en el schema pero sí en el documento
      const name = empresa.get('name');
      if (name) {
        empresa.razonSocial = name;
        await empresa.save();
      }
    }

    console.log('Migración completada.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

migrate();
