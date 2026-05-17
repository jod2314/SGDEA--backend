const { create } = require('xmlbuilder2');
const HistorialDocumento = require('../schema/historialDocumento');

/**
 * Genera el Índice Electrónico XML de un expediente conforme a las directrices del AGN.
 * 
 * @param {Object} expediente - El objeto del expediente poblado.
 * @returns {Promise<string>} - El XML generado como string.
 */
async function generarIndiceElectronicoXML(expediente) {
  // 1. Obtener todos los documentos vinculados al expediente, ordenados cronológicamente
  const documentos = await HistorialDocumento.find({ expedienteId: expediente._id })
    .sort({ createdAt: 1 })
    .populate('usuarioId', 'name');

  // 2. Construir la estructura XML
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('IndiceElectronico', { 
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:noNamespaceSchemaLocation': 'indice_electronico.xsd' 
    })
      .ele('MetadatosExpediente')
        .ele('NombreExpediente').txt(expediente.nombreExpediente).up()
        .ele('CodigoTRD').txt(expediente.codigoTRD).up()
        .ele('FechaApertura').txt(expediente.fechaApertura.toISOString()).up()
        .ele('FechaCierre').txt(new Date().toISOString()).up()
        .ele('Estado').txt('CERRADO').up()
      .up()
      .ele('DocumentosVinculados');

  // 3. Añadir cada documento con su metadato de foliación e integridad
  documentos.forEach((doc, index) => {
    root.ele('Documento')
      .ele('Folio').txt((index + 1).toString()).up()
      .ele('NombreDocumento').txt(doc.numeroRadicado || 'SIN_RADICADO').up()
      .ele('FechaEmision').txt(doc.fechaGeneracion.toISOString()).up()
      .ele('HashSHA256').txt(doc.hashIntegridad).up()
      .ele('TipoArchivo').txt(doc.tipoArchivo).up()
      .ele('Autor').txt(doc.usuarioId?.name || 'Sistema').up()
    .up();
  });

  return root.end({ prettyPrint: true });
}

module.exports = {
  generarIndiceElectronicoXML
};
