const { create } = require('xmlbuilder2');
const crypto = require('crypto');
const HistorialDocumento = require('../schema/historialDocumento');
const Empresa = require('../schema/empresa');
const Dependencia = require('../schema/dependencia');
const Expediente = require('../schema/expediente');

/**
 * Calcula un HMAC (Sello Electrónico de Tiempo/Integridad) para el contenido del XML.
 * Solución ingeniosa para proveer integridad probatoria sin infraestructura PKI compleja.
 */
function firmarIndiceXML(xmlContent) {
  // En producción, este secreto debe venir de process.env.XML_SIGNATURE_SECRET
  const secret = process.env.JWT_SECRET || 'fallback-secret-sgdea-2025';
  return crypto.createHmac('sha256', secret).update(xmlContent).digest('hex');
}

/**
 * Genera el Índice Electrónico XML de un expediente conforme a las directrices del AGN,
 * incluyendo un sello criptográfico de integridad.
 * 
 * @param {Object} expediente - El objeto del expediente poblado.
 * @returns {Promise<string>} - El XML generado como string firmado.
 */
async function generarIndiceElectronicoXML(expediente) {
  // 1. Obtener todos los documentos vinculados al expediente, ordenados cronológicamente
  const documentos = await HistorialDocumento.find({ expedienteId: expediente._id })
    .sort({ createdAt: 1 })
    .populate('usuarioId', 'name');

  // 2. Construir la estructura principal del XML
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('IndiceElectronico', { 
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:noNamespaceSchemaLocation': 'indice_electronico.xsd' 
    });
    
  root.ele('MetadatosExpediente')
      .ele('NombreExpediente').txt(expediente.nombreExpediente || '').up()
      .ele('CodigoTRD').txt(expediente.codigoTRD || '').up()
      .ele('FechaApertura').txt(expediente.fechaApertura ? expediente.fechaApertura.toISOString() : '').up()
      .ele('FechaCierre').txt(new Date().toISOString()).up()
      .ele('Estado').txt('CERRADO').up()
    .up();

  const docsNodo = root.ele('DocumentosVinculados');

  // 3. Añadir cada documento con su metadato de foliación e integridad
  documentos.forEach((doc, index) => {
    docsNodo.ele('Documento')
      .ele('Folio').txt((index + 1).toString()).up()
      .ele('NombreDocumento').txt(doc.numeroRadicado || 'SIN_RADICADO').up()
      .ele('FechaEmision').txt(doc.fechaGeneracion ? doc.fechaGeneracion.toISOString() : '').up()
      .ele('HashSHA256').txt(doc.hashIntegridad || '').up()
      .ele('TipoArchivo').txt(doc.tipoArchivo || 'PDF').up()
      .ele('Autor').txt(doc.usuarioId?.name || 'Sistema').up()
    .up();
  });

  // 4. Generar el XML temporal sin formatear para calcular la firma exacta
  const rawXmlParaFirma = root.end({ prettyPrint: false });
  const selloIntegridad = firmarIndiceXML(rawXmlParaFirma);

  // 5. Añadir el nodo de Firma al documento final
  root.ele('SelloCriptografico')
    .ele('Algoritmo').txt('HMAC-SHA256').up()
    .ele('Hash').txt(selloIntegridad).up()
    .ele('Timestamp').txt(new Date().toISOString()).up()
  .up();

  // Devolver el XML formateado para legibilidad (prettyPrint no afecta la validación si se normaliza)
  return root.end({ prettyPrint: true });
}

async function validarAutorizacionJefe(empresaId, expedientesIds, usuarioId, usuarioRole) {
  const empresa = await Empresa.findById(empresaId);
  if (!empresa?.configuracionSGD?.requiereAutorizacionJefe) {
    return true; // No requiere autorización si la bandera está desactivada
  }

  const expedientesData = await Expediente.find({ _id: { $in: expedientesIds }, empresaId });
  const dependenciasIds = [...new Set(expedientesData.map(e => e.dependenciaId.toString()))];
  
  const dependencias = await Dependencia.find({ _id: { $in: dependenciasIds }, empresaId });
  const jefesIds = dependencias.map(d => d.jefeDependenciaId?.toString()).filter(Boolean);

  const esJefe = jefesIds.includes(usuarioId);
  const esAdmin = usuarioRole === 'admin';

  return esJefe || esAdmin;
}

module.exports = {
  generarIndiceElectronicoXML,
  firmarIndiceXML,
  validarAutorizacionJefe
};
