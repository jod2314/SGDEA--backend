const OnboardingWizard = require('../schema/onboardingWizard');
const { generarPDFDocumental } = require('./generadorDocumentos');
const HistorialDocumento = require('../schema/historialDocumento');
const Empresa = require('../schema/empresa');

/**
 * Mapeo de estados y su porcentaje de progreso.
 */
const PROGRESO_PASOS = {
  'INICIO': 0,
  'DIAGNOSTICO_MGDA': 20,
  'COMITE_ARCHIVO': 40,
  'POLITICA_DOCUMENTAL': 60,
  'PGD': 80,
  'COMPLETO': 100
};

/**
 * Obtiene o crea el estado del wizard para una empresa.
 */
async function obtenerEstadoWizard(empresaId) {
  let wizard = await OnboardingWizard.findOne({ empresaId });
  if (!wizard) {
    wizard = new OnboardingWizard({ empresaId });
    await wizard.save();
  }
  return wizard;
}

/**
 * Guarda las respuestas de un paso y avanza el estado.
 */
async function guardarRespuestasYPasar(empresaId, paso, respuestas) {
  const wizard = await obtenerEstadoWizard(empresaId);
  
  wizard.respuestas[paso.toLowerCase()] = respuestas;
  
  // Lógica de transición de estados
  if (wizard.estadoActual === 'INICIO' && paso === 'DIAGNOSTICO') {
    wizard.estadoActual = 'DIAGNOSTICO_MGDA';
  } else if (wizard.estadoActual === 'DIAGNOSTICO_MGDA' && paso === 'COMITE') {
    wizard.estadoActual = 'COMITE_ARCHIVO';
  } else if (wizard.estadoActual === 'COMITE_ARCHIVO' && paso === 'POLITICA') {
    wizard.estadoActual = 'POLITICA_DOCUMENTAL';
  } else if (wizard.estadoActual === 'POLITICA_DOCUMENTAL' && paso === 'PGD') {
    wizard.estadoActual = 'PGD';
  } else if (wizard.estadoActual === 'PGD' && paso === 'FONDOS') {
    wizard.estadoActual = 'COMPLETO';
  }
  
  wizard.progreso = PROGRESO_PASOS[wizard.estadoActual];
  await wizard.save();
  return wizard;
}

/**
 * Genera un documento institucional basado en las respuestas del wizard.
 */
async function generarDocumentoFundacional(empresaId, tipo, usuarioId) {
  const wizard = await OnboardingWizard.findOne({ empresaId });
  const empresa = await Empresa.findById(empresaId);
  
  if (!wizard) throw new Error('Wizard no iniciado');

  let htmlContent = "";
  let nombreDocumento = "";

  if (tipo === 'ACTA_COMITE') {
    const r = wizard.respuestas.comite;
    nombreDocumento = "Acta de Constitución del Comité de Archivo";
    htmlContent = `
      <h1 class="text-center">ACTA DE CONSTITUCIÓN DEL COMITÉ DE ARCHIVO</h1>
      <p>En la ciudad de {{entidad.ciudad}}, siendo el día {{documento.fecha}}, se reunieron los directivos de <strong>{{maestros.membrete.razonSocial}}</strong> para formalizar la creación del Comité de Archivo.</p>
      <h3>Integrantes:</h3>
      <ul>
        <li>Presidente: ${r.presidente || 'No asignado'}</li>
        <li>Secretario: ${r.secretario || 'No asignado'}</li>
        <li>Responsable de Archivo: ${r.responsableArchivo || 'No asignado'}</li>
      </ul>
      <h3>Funciones:</h3>
      <p>${r.funciones || 'Las establecidas en el Decreto 1080 de 2015.'}</p>
    `;
  } else if (tipo === 'POLITICA') {
    const r = wizard.respuestas.politica;
    nombreDocumento = "Política de Gestión Documental";
    htmlContent = `
      <h1 class="text-center">POLÍTICA DE GESTIÓN DOCUMENTAL</h1>
      <p><strong>Misión:</strong> ${r.mision || 'No definida'}</p>
      <h3>Alcance:</h3>
      <p>${r.alcance || 'Toda la organización.'}</p>
      <h3>Principios:</h3>
      <p>${r.principios || 'Eficiencia, transparencia y preservación.'}</p>
    `;
  }

  // Fusión de datos usando el generador base
  const dataContext = {
    maestros: { membrete: { razonSocial: empresa.razonSocial } },
    entidad: { ciudad: empresa.ciudad || 'Bogotá' },
    documento: { fecha: new Date().toLocaleDateString('es-CO') }
  };

  const { buffer, hash } = await generarPDFDocumental(htmlContent, dataContext);

  const registroDoc = new HistorialDocumento({
    plantillaId: null, // Es un documento de sistema, no usa plantilla de usuario
    empresaId,
    usuarioId,
    datosUsados: wizard.respuestas,
    hashIntegridad: hash,
    numeroRadicado: `SISTEMA-${tipo}-${new Date().getFullYear()}`,
    tipoArchivo: 'PDF'
  });
  await registroDoc.save();

  wizard.documentosGenerados.push({
    tipo,
    documentoId: registroDoc._id
  });
  await wizard.save();

  return buffer;
}

module.exports = {
  obtenerEstadoWizard,
  guardarRespuestasYPasar,
  generarDocumentoFundacional
};
