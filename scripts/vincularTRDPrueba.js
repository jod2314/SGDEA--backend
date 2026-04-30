const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Empresa = require('../schema/empresa');
const Dependencia = require('../schema/dependencia');
const SerieDocumental = require('../schema/serieDocumental');
const SubserieDocumental = require('../schema/subserieDocumental');
const TRD = require('../schema/tablaRetencionDocumental');

async function vinculate() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
    const empresaId = '69f0e790e173d144684c3b8d';
    const dep = await Dependencia.findOne({ empresaId });
    if (!dep) throw new Error('No se encontró dependencia para esta empresa');
    const sub = await SubserieDocumental.findOne({}).populate('serieId'); 

    const codigoTRD = `${dep.codigoDependencia}-${sub.serieId.codigoSerie}-${sub.codigoSubserie}`;

    await TRD.findOneAndUpdate(
      { empresaId, subserieId: sub._id },
      { dependenciaId: dep._id, codigoTRD, estado: 'vigente' },
      { upsert: true }
    );

    console.log('TRD vinculada para pruebas.');
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}
vinculate();
