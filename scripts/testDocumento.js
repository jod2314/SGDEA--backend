const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const { generarPdf, generarCodigoTRD } = require('../services/generadorDocumentos');
const Empresa = require('../schema/empresa');
const Dependencia = require('../schema/dependencia');
const SerieDocumental = require('../schema/serieDocumental');
const SubserieDocumental = require('../schema/subserieDocumental');
const TRD = require('../schema/tablaRetencionDocumental');

async function test() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    console.log('Conectado a la DB para pruebas...');

    // 1. Buscar empresa (Usamos la que poblamos con BANTER)
    const empresaId = '69f0e790e173d144684c3b8d';
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    // 2. Buscar una TRD configurada
    const trdDoc = await TRD.findOne({ empresaId: empresa._id })
      .populate('dependenciaId')
      .populate({
        path: 'subserieId',
        populate: { path: 'serieId' }
      });

    if (!trdDoc) throw new Error('No hay TRD configurada para esta empresa. Ejecuta el seeding y vincula una TRD primero.');

    console.log(`Probando con TRD: ${trdDoc.codigoTRD}`);

    // 3. Generar Código TRD Dinámico
    const codigoCompleto = await generarCodigoTRD({
      empresaId: empresa._id,
      codigoDep: trdDoc.dependenciaId.codigoDependencia,
      codigoSer: trdDoc.subserieId.serieId.codigoSerie,
      codigoSub: trdDoc.subserieId.codigoSubserie,
      version: '1.0',
      anio: '2026'
    });

    console.log(`Código Generado: ${codigoCompleto}`);

    // 4. Simular Generación de PDF
    const datos = {
      empresa: empresa.toObject(),
      entidad: { nombre: 'Juan Perez', numeroIdentificacion: '123456', direccion: 'Calle 123' },
      trd: codigoCompleto,
      fecha_actual: '29 de abril de 2026'
    };

    const html = `
      <h1 class="text-center">CONSTANCIA DE TRABAJO</h1>
      <p>Se hace constar que {{entidad.nombre}} con {{entidad.numeroIdentificacion}} trabaja en {{empresa.razonSocial}}.</p>
      <p>Expedido el {{fecha_actual}}.</p>
    `;

    const { buffer, hash, htmlFinal } = await generarPdf(html, datos);

    console.log(`PDF Generado con éxito. Hash: ${hash}`);
    console.log(`HTML Final:\n${htmlFinal}`);

    await mongoose.disconnect();
    console.log('Prueba finalizada con éxito.');
  } catch (error) {
    console.error('Error en la prueba:', error);
    process.exit(1);
  }
}

test();
