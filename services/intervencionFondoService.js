const mongoose = require('mongoose');
const IntervencionFondo = require('../schema/intervencionFondo');
const Empresa = require('../schema/empresa');
const HistorialDocumento = require('../schema/historialDocumento');
const { generarPDFDocumental } = require('./generadorDocumentos');

const TAREAS_CHECKLIST = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6',
  '2.1', '2.2', '2.3', '2.4',
  '3.1', '3.2', '3.3', '3.4',
  '4.1', '4.2', '4.3', '4.4', '4.5',
  '5.1', '5.2', '5.3', '5.4', '5.5',
  '6.1', '6.2', '6.3', '6.4', '6.5',
  '7.1', '7.2', '7.3', '7.4'
];

const TOTAL_TAREAS = TAREAS_CHECKLIST.length;

/**
 * Obtiene o inicializa el estado de la intervención para una empresa específica.
 */
async function obtenerEstadoIntervencion(empresaId) {
  let intervencion = await IntervencionFondo.findOne({ empresaId });
  if (!intervencion) {
    intervencion = new IntervencionFondo({ empresaId });
    // Inicializar la checklist con todas las tareas en false
    TAREAS_CHECKLIST.forEach(t => {
      intervencion.checklist.set(t, false);
    });
    await intervencion.save();
  }
  return intervencion;
}

/**
 * Actualiza el estado de completitud de una tarea y recalcula el progreso.
 */
async function actualizarTareaChecklist(empresaId, tareaId, completado) {
  const intervencion = await obtenerEstadoIntervencion(empresaId);
  
  if (!TAREAS_CHECKLIST.includes(tareaId)) {
    throw new Error(`La tarea '${tareaId}' no es válida en la checklist oficial.`);
  }

  intervencion.checklist.set(tareaId, !!completado);

  // Calcular progreso general
  let completadas = 0;
  TAREAS_CHECKLIST.forEach(t => {
    if (intervencion.checklist.get(t) === true) {
      completadas++;
    }
  });

  intervencion.progreso = Math.round((completadas / TOTAL_TAREAS) * 100);

  // Avanzar automáticamente de fase si todas las tareas de la fase activa están completadas
  const faseActualStr = String(intervencion.faseActual);
  const tareasDeFase = TAREAS_CHECKLIST.filter(t => t.startsWith(faseActualStr));
  const todasCompletadas = tareasDeFase.every(t => intervencion.checklist.get(t) === true);

  if (todasCompletadas && intervencion.faseActual < 7 && completado) {
    intervencion.faseActual += 1;
  }

  await intervencion.save();
  return intervencion;
}

/**
 * Registra o actualiza el estado de una contingencia en la intervención.
 */
async function registrarContingencia(empresaId, contingenciaId, detalles) {
  const intervencion = await obtenerEstadoIntervencion(empresaId);
  intervencion.contingencias.set(contingenciaId, detalles);
  await intervencion.save();
  return intervencion;
}

/**
 * Genera y oficializa a PDF/A inmutable un acta de intervención.
 */
async function generarActaIntervencion(empresaId, tipoActa, datos, usuarioId) {
  const intervencion = await obtenerEstadoIntervencion(empresaId);
  const empresa = await Empresa.findById(empresaId);

  if (!empresa) throw new Error('Empresa no encontrada');

  let htmlContent = "";
  let nombreDocumento = "";

  const fechaActual = new Date().toLocaleDateString('es-CO');

  if (tipoActa === 'ACTA_CONSTITUCION_COMITE') {
    nombreDocumento = "Acta de Constitución del Comité de Archivo";
    htmlContent = `
      <h1 style="text-align: center;">ACTA DE CONSTITUCIÓN DEL COMITÉ DE ARCHIVO</h1>
      <p>En la ciudad de ${empresa.ciudad || 'Bogotá'}, siendo el día ${fechaActual}, se reunieron los directivos y representantes de la organización <strong>${empresa.razonSocial}</strong> con NIT <strong>${empresa.nit || 'No definido'}</strong> para conformar legalmente el Comité de Archivo, órgano regulador del proceso de organización física e intervención de sus fondos acumulados de acuerdo con la Ley 594 de 2000 y el Decreto 1080 de 2015.</p>
      <h3>1. Miembros e Integrantes del Comité:</h3>
      <ul>
        <li><strong>Presidente (Gerente o Delegado):</strong> ${datos.presidente || 'No asignado'}</li>
        <li><strong>Secretario del Comité:</strong> ${datos.secretario || 'No asignado'}</li>
        <li><strong>Responsable de Archivo (Secretaría Técnica):</strong> ${datos.responsableArchivo || 'No asignado'}</li>
        <li><strong>Asesor Jurídico / Delegado:</strong> ${datos.asesorJuridico || 'No asignado'}</li>
      </ul>
      <h3>2. Funciones y Responsabilidades:</h3>
      <p>${datos.funciones || 'Aprobar los instrumentos archivísticos (CCD, TVD), autorizar la eliminación de documentos valorados que hayan cumplido su ciclo de retención, y supervisar la implementación del sistema de gestión documental de la empresa.'}</p>
      <h3>3. Compromiso de Gestión:</h3>
      <p>Los miembros se comprometen a sesionar periódicamente de forma ordinaria para validar los avances del proceso de organización del archivo histórico de la empresa y expedir las respectivas actas que salvaguarden legalmente cada decisión.</p>
    `;
  } else if (tipoActa === 'ACTA_CUARENTENA_PLAGAS') {
    nombreDocumento = "Acta de Cuarentena y Desinfección de Lotes";
    htmlContent = `
      <h1 style="text-align: center;">ACTA DE INGRESO A CUARENTENA Y DESINFECCIÓN DE ARCHIVOS</h1>
      <p>En las instalaciones de <strong>${empresa.razonSocial}</strong>, en el área de archivo central/acumulados, se hace constar el reporte de una contingencia de contaminación biológica detectada durante el procesamiento del archivo histórico.</p>
      <h3>1. Detalles del Lote Afectado:</h3>
      <ul>
        <li><strong>Descripción del Lote:</strong> ${datos.descripcionLote || 'No definida'}</li>
        <li><strong>Ubicación de Origen:</strong> ${datos.ubicacionOrigen || 'No definida'}</li>
        <li><strong>Tipo de Contaminación Detectada:</strong> ${datos.tipoPlaga || 'Humedad activa / Hongos'}</li>
      </ul>
      <h3>2. Medidas de Contingencia Adoptadas (Directrices del AGN):</h3>
      <p>Se ha procedido con el aislamiento preventivo del lote en zona ventilada de cuarentena para evitar la proliferación de esporas al archivo sano. Se autoriza y ejecuta el procedimiento de desinfección en seco y limpieza física controlada.</p>
      <h3>3. Responsables del Procedimiento:</h3>
      <p><strong>Ejecutor / Archivista:</strong> ${datos.operario || 'Técnico de Archivo'}</p>
    `;
  } else if (tipoActa === 'ACTA_ELIMINACION_ACUMULADOS') {
    nombreDocumento = "Acta de Eliminación Documental de Fondos Acumulados";
    htmlContent = `
      <h1 style="text-align: center;">ACTA OFICIAL DE ELIMINACIÓN DOCUMENTAL</h1>
      <p>Por la cual se autoriza la baja documental y destrucción física controlada de series documentales pertenecientes a los fondos acumulados de la organización <strong>${empresa.razonSocial}</strong>, habiendo cumplido sus tiempos de retención y careciendo de valores históricos secundarios según las Tablas de Valoración Documental (TVD) vigentes y aprobadas por el Comité de Archivo.</p>
      <h3>1. Detalle de Documentación Objeto de Eliminación:</h3>
      <p>${datos.detalleEliminacion || 'Facturas de compra de periodos contables ya prescritos, duplicados de correspondencia y documentos de apoyo sin valor probatorio.'}</p>
      <h3>2. Volumen e Impacto de la Eliminación:</h3>
      <ul>
        <li><strong>Metros Lineales Aprox:</strong> ${datos.metrosLineales || '0'} m.l.</li>
        <li><strong>Número de Cajas/Carpetas:</strong> ${datos.cantidadUnidades || '0'} unidades.</li>
      </ul>
      <h3>3. Certificación de Destrucción:</h3>
      <p>El Comité de Archivo autoriza la destrucción física por método de trituración ecológica certificada, asegurando la confidencialidad de la información y la preservación del medio ambiente.</p>
    `;
  } else {
    throw new Error(`El tipo de acta '${tipoActa}' no es compatible con el sistema de intervención.`);
  }

  // Fusión de contexto para el generador base de PDF
  const dataContext = {
    maestros: { membrete: { razonSocial: empresa.razonSocial, nit: empresa.nit } },
    entidad: { ciudad: empresa.ciudad || 'Bogotá' },
    documento: { fecha: fechaActual }
  };

  const { buffer, hash } = await generarPDFDocumental(htmlContent, dataContext);

  // Crear registro en el historial de documentos inmutables
  const registroDoc = new HistorialDocumento({
    plantillaId: null,
    empresaId,
    usuarioId,
    datosUsados: datos,
    hashIntegridad: hash,
    numeroRadicado: `INTERVENCION-${tipoActa}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    tipoArchivo: 'PDF'
  });
  await registroDoc.save();

  // Guardar en el histórico de documentos de la intervención
  intervencion.documentosGenerados.push({
    tipo: tipoActa,
    documentoId: registroDoc._id
  });
  
  // Marcar automáticamente la tarea asociada si aplica
  const mapeoTareas = {
    'ACTA_CONSTITUCION_COMITE': '2.2',
    'ACTA_CUARENTENA_PLAGAS': '4.3',
    'ACTA_ELIMINACION_ACUMULADOS': '6.2'
  };
  
  const tareaAsociada = mapeoTareas[tipoActa];
  if (tareaAsociada) {
    intervencion.checklist.set(tareaAsociada, true);
    
    // Recalcular progreso
    let completadas = 0;
    TAREAS_CHECKLIST.forEach(t => {
      if (intervencion.checklist.get(t) === true) {
        completadas++;
      }
    });
    intervencion.progreso = Math.round((completadas / TOTAL_TAREAS) * 100);
  }

  await intervencion.save();

  return { buffer, docId: registroDoc._id, wizard: intervencion };
}

module.exports = {
  obtenerEstadoIntervencion,
  actualizarTareaChecklist,
  registrarContingencia,
  generarActaIntervencion
};
