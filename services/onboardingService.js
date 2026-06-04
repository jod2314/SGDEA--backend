const mongoose = require('mongoose');
const OnboardingWizard = require('../schema/onboardingWizard');
const { generarPDFDocumental } = require('./generadorDocumentos');
const HistorialDocumento = require('../schema/historialDocumento');
const Empresa = require('../schema/empresa');
const fs = require('fs');
const path = require('path');


/**
 * Mapeo de estados y su porcentaje de progreso por defecto.
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
 * Acceso seguro a las respuestas del Map de Mongoose u objeto plano de JS
 */
function obtenerRespuesta(respuestas, paso) {
  if (!respuestas) return undefined;
  return typeof respuestas.get === 'function' ? respuestas.get(String(paso)) : respuestas[String(paso)];
}

/**
 * Verifica si existe una respuesta guardada para un paso de forma segura
 */
function tieneRespuesta(respuestas, paso) {
  if (!respuestas) return false;
  return typeof respuestas.has === 'function' ? respuestas.has(String(paso)) : respuestas[String(paso)] !== undefined;
}

/**
 * Calcula el progreso de madurez del onboarding sumando componentes reglamentarios.
 */
async function calcularProgresoYMadurez(wizard, empresaId) {
  let progresoRespuestas = 0;
  // 5% por cada respuesta de pasos 0 al 7 almacenada en el Map (max 40%)
  for (let i = 0; i <= 7; i++) {
    if (tieneRespuesta(wizard.respuestas, i)) {
      progresoRespuestas += 5;
    }
  }
  progresoRespuestas = Math.min(progresoRespuestas, 40);

  // 15% si se ha generado el acta de comité ('ACTA_COMITE') o si la respuesta en paso 3 indica que ya existe ('si')
  const haGeneradoActa = wizard.documentosGenerados && wizard.documentosGenerados.some(doc => doc.tipo === 'ACTA_COMITE');
  const respuestasPaso3 = obtenerRespuesta(wizard.respuestas, '3');
  const comiteExisteEnPaso3 = respuestasPaso3 && (
    respuestasPaso3.tieneComite === 'si' ||
    respuestasPaso3.comiteExiste === 'si' ||
    Object.values(respuestasPaso3).includes('si')
  );
  const bonoComite = (haGeneradoActa || comiteExisteEnPaso3) ? 15 : 0;

  // 20% si hay alguna TRD registrada y vigente en la colección 'TablaRetencionDocumental'
  let bonoTRD = 0;
  try {
    let TablaRetencion;
    try {
      TablaRetencion = mongoose.model('TablaRetencionDocumental');
    } catch (e) {
      TablaRetencion = require('../schema/tablaRetencionDocumental');
    }
    if (TablaRetencion) {
      const countTRD = await TablaRetencion.countDocuments({ empresaId, estado: 'vigente' });
      bonoTRD = countTRD > 0 ? 20 : 0;
    }
  } catch (err) {
    console.error("Error al contar TRD para madurez:", err);
  }

  // 10% si respondió 'no' a fondos acumulados o si hay fondos creados en 'FondoAcumulado'
  let bonoFondos = 0;
  try {
    const respuestasPaso1 = obtenerRespuesta(wizard.respuestas, '1');
    const respondioNoFondos = respuestasPaso1 && (
      respuestasPaso1.poseeFondos === 'no' ||
      respuestasPaso1.tieneFondos === 'no' ||
      Object.values(respuestasPaso1).includes('no')
    );
    let FondoAcumulado;
    try {
      FondoAcumulado = mongoose.model('FondoAcumulado');
    } catch (e) {
      FondoAcumulado = require('../schema/fondoAcumulado');
    }
    let countFondos = 0;
    if (FondoAcumulado) {
      countFondos = await FondoAcumulado.countDocuments({ empresaId });
    }
    bonoFondos = (respondioNoFondos || countFondos > 0) ? 10 : 0;
  } catch (err) {
    console.error("Error al contar fondos para madurez:", err);
  }

  // 15% si tiene manuales generados o seleccionados en paso 5
  const respuestasPaso5 = obtenerRespuesta(wizard.respuestas, '5');
  let tieneManualesPaso5 = false;
  if (respuestasPaso5) {
    if (Array.isArray(respuestasPaso5)) {
      tieneManualesPaso5 = respuestasPaso5.length > 0;
    } else if (typeof respuestasPaso5 === 'object') {
      if (Array.isArray(respuestasPaso5.seleccionados) && respuestasPaso5.seleccionados.length > 0) {
        tieneManualesPaso5 = true;
      } else if (Array.isArray(respuestasPaso5.existentes) && respuestasPaso5.existentes.length > 0) {
        tieneManualesPaso5 = true;
      } else {
        for (const [key, val] of Object.entries(respuestasPaso5)) {
          if (key.toLowerCase().includes('manual') && (val === true || val === 'si' || val === 'existente')) {
            tieneManualesPaso5 = true;
            break;
          }
        }
      }
    }
  }
  const haGeneradoManual = wizard.documentosGenerados && wizard.documentosGenerados.some(doc => doc.tipo && doc.tipo.includes('MANUAL'));
  const bonoManuales = (tieneManualesPaso5 || haGeneradoManual) ? 15 : 0;

  return Math.min(progresoRespuestas + bonoComite + bonoTRD + bonoFondos + bonoManuales, 100);
}

/**
 * Guarda las respuestas de un paso y avanza el estado del onboarding.
 */
async function guardarRespuestasYPasar(empresaId, paso, respuestas) {
  const wizard = await obtenerEstadoWizard(empresaId);
  const pasoKey = String(paso);
  const pasoNum = Number(paso);

  // Guardar respuestas en el Map respuestas del wizard
  wizard.respuestas.set(pasoKey, respuestas);

  // Realizar la transición lógica de 'wizard.pasoActual'
  if (wizard.pasoActual === 0) {
    wizard.pasoActual = 1;
  } else if (wizard.pasoActual === 1) {
    if (respuestas && (respuestas.poseeFondos === 'no' || respuestas.tieneFondos === 'no')) {
      wizard.pasoActual = 3; // salta el paso 2
    } else {
      wizard.pasoActual = 2;
    }
  } else {
    wizard.pasoActual = wizard.pasoActual + 1;
  }

  // Mapear el pasoActual a los estados visuales permitidos en el enum para compatibilidad con el front
  const mapeoEstados = {
    0: 'INICIO',
    1: 'DIAGNOSTICO_MGDA',
    2: 'COMITE_ARCHIVO',
    3: 'POLITICA_DOCUMENTAL',
    4: 'PGD'
  };
  if (wizard.pasoActual in mapeoEstados) {
    wizard.estadoActual = mapeoEstados[wizard.pasoActual];
  }

  // Función auxiliar para agregar tareas de forma única
  function agregarTareaUnica(titulo, moduloDestino) {
    if (!wizard.tareasChecklist) {
      wizard.tareasChecklist = [];
    }
    const existe = wizard.tareasChecklist.some(t => t.titulo === titulo);
    if (!existe) {
      wizard.tareasChecklist.push({
        titulo,
        moduloDestino: moduloDestino || "",
        completada: false
      });
    }
  }

  // Generar dinámicamente las tareas de 'tareasChecklist' según el paso y las respuestas
  if (pasoNum === 1) {
    if (respuestas && (respuestas.poseeFondos === 'si' || respuestas.tieneFondos === 'si')) {
      agregarTareaUnica(
        "Realizar inventario preliminar de fondos acumulados", 
        "/fondos-acumulados"
      );
    }
  } else if (pasoNum === 3) {
    if (respuestas && (respuestas.tieneComite === 'no' || respuestas.tieneComite === 'verbal')) {
      agregarTareaUnica(
        "Aprobar acta institucional del Comité de Archivo", 
        "/estructura-organizacional"
      );
    }
  } else if (pasoNum === 4) {
    const opcionTabla = respuestas ? (respuestas.tipoTabla || respuestas.tabla || respuestas.seleccion || respuestas.opcion) : null;
    const esTrdOAmbos = opcionTabla === 'trd' || opcionTabla === 'ambos' || Object.values(respuestas || {}).includes('trd') || Object.values(respuestas || {}).includes('ambos');
    const esTvd = opcionTabla === 'tvd' || Object.values(respuestas || {}).includes('tvd');

    if (esTrdOAmbos) {
      agregarTareaUnica(
        "Construir y aprobar la Tabla de Retención Documental (TRD)", 
        "/configuracion-trd"
      );
    } else if (esTvd) {
      agregarTareaUnica(
        "Construir y aprobar la Tabla de Valoración Documental (TVD)", 
        "/configuracion-trd"
      );
    }
  } else if (pasoNum === 5) {
    let manualesFaltantes = [];
    if (Array.isArray(respuestas)) {
      manualesFaltantes = respuestas;
    } else if (respuestas && typeof respuestas === 'object') {
      if (Array.isArray(respuestas.manualesFaltantes)) {
        manualesFaltantes = respuestas.manualesFaltantes;
      } else if (Array.isArray(respuestas.faltantes)) {
        manualesFaltantes = respuestas.faltantes;
      } else if (Array.isArray(respuestas.manuales)) {
        manualesFaltantes = respuestas.manuales.filter(m => m.faltante || m.estado === 'faltante').map(m => m.nombre || m);
      } else {
        for (const [key, val] of Object.entries(respuestas)) {
          if (key.toLowerCase().includes('manual')) {
            if (val === false || val === 'no' || val === 'faltante') {
              const nombreManual = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              manualesFaltantes.push(nombreManual);
            }
          }
        }
      }
    }
    
    manualesFaltantes.forEach(manual => {
      agregarTareaUnica(`Elaborar e implementar: ${manual}`, "/manuales");
    });
  }

  // Calcular el progreso de madurez del onboarding
  wizard.progreso = await calcularProgresoYMadurez(wizard, empresaId);

  // Si pasoActual supera 7, cambiar 'wizard.estadoActual' a 'COMPLETO' y actualizar 'onboardingCompleted: true' en Empresa
  if (wizard.pasoActual > 7) {
    wizard.estadoActual = 'COMPLETO';
    await Empresa.findByIdAndUpdate(empresaId, { onboardingCompleted: true });
  }

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
    const r = obtenerRespuesta(wizard.respuestas, '3') || {};
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
    const r = obtenerRespuesta(wizard.respuestas, '5') || {};
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

/**
 * Carga el borrador HTML de un manual e inyecta dinámicamente las variables del onboarding.

 */
async function obtenerPlantillaManual(empresaId, tipo) {
  const wizard = await OnboardingWizard.findOne({ empresaId });
  const empresa = await Empresa.findById(empresaId);
  
  if (!wizard) throw new Error('Wizard no iniciado');
  if (!empresa) throw new Error('Empresa no encontrada');

  const tipoNormalizado = tipo.toLowerCase().trim();
  const filePath = path.join(__dirname, `../templates/manuales/${tipoNormalizado}.html`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`La plantilla del manual tipo '${tipo}' no existe.`);
  }

  let htmlContent = fs.readFileSync(filePath, 'utf-8');

  // Obtener respuestas de pasos específicos
  const rPaso0 = obtenerRespuesta(wizard.respuestas, '0') || {};
  const rPaso3 = obtenerRespuesta(wizard.respuestas, '3') || {};

  // Mapeo de reemplazos de variables dinámicas
  const reemplazos = {
    '{{empresaNombre}}': empresa.razonSocial || rPaso0.nombreComercial || 'Empresa de Prueba',
    '{{empresaNit}}': empresa.nit || rPaso0.nit || '000000000-0',
    '{{presidenteComite}}': rPaso3.presidente || 'Presidente No Asignado',
    '{{secretarioComite}}': rPaso3.secretario || 'Secretario No Asignado',
    '{{responsableArchivo}}': rPaso3.responsableArchivo || 'Responsable de Archivo No Asignado',
    '{{madurezMGDA}}': wizard.progreso || 0,
    '{{fechaEmision}}': new Date().toLocaleDateString('es-CO'),
    '{{anioActual}}': new Date().getFullYear().toString()
  };

  // Reemplazar todas las ocurrencias
  for (const [variable, valor] of Object.entries(reemplazos)) {
    const regex = new RegExp(variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    htmlContent = htmlContent.replace(regex, valor);
  }

  return htmlContent;
}

/**
 * Oficializa el borrador del manual editado en el editor Tiptap convirtiéndolo en un PDF inmutable y actualizando el checklist.
 */
async function oficializarManual(empresaId, tipo, htmlContent, usuarioId) {
  const wizard = await OnboardingWizard.findOne({ empresaId });
  const empresa = await Empresa.findById(empresaId);

  if (!wizard) throw new Error('Wizard no iniciado');
  if (!empresa) throw new Error('Empresa no encontrada');

  const tipoDoc = tipo.toUpperCase().trim(); // MANUAL-GESTION o PGD
  
  // Generar PDF inmutable con hash
  const dataContext = {
    maestros: { membrete: { razonSocial: empresa.razonSocial } },
    entidad: { ciudad: empresa.ciudad || 'Bogotá' },
    documento: { fecha: new Date().toLocaleDateString('es-CO') }
  };

  const { buffer, hash } = await generarPDFDocumental(htmlContent, dataContext);

  // Registrar en HistorialDocumento
  const registroDoc = new HistorialDocumento({
    plantillaId: null,
    empresaId,
    usuarioId,
    datosUsados: wizard.respuestas,
    hashIntegridad: hash,
    numeroRadicado: `SISTEMA-${tipoDoc}-${new Date().getFullYear()}`,
    tipoArchivo: 'PDF'
  });
  await registroDoc.save();

  // Guardar en documentosGenerados del wizard
  wizard.documentosGenerados.push({
    tipo: `MANUAL_${tipoDoc}`,
    documentoId: registroDoc._id
  });

  // Marcar la tarea del checklist de onboarding como completada en vivo
  // Las tareas tienen nombres del tipo: "Elaborar e implementar: Manual De Gestion Documental"
  const nombreBuscado = tipoDoc === 'MANUAL-GESTION' ? 'Manual de Gestión Documental' : 'Programa de Gestión Documental (PGD)';
  if (wizard.tareasChecklist) {
    wizard.tareasChecklist.forEach(t => {
      if (t.titulo.toLowerCase().includes(nombreBuscado.toLowerCase())) {
        t.completada = true;
      }
    });
  }

  // Recalcular progreso del wizard
  wizard.progreso = await calcularProgresoYMadurez(wizard, empresaId);
  await wizard.save();

  return { wizard, buffer };
}

module.exports = {
  obtenerEstadoWizard,
  guardarRespuestasYPasar,
  generarDocumentoFundacional,
  obtenerPlantillaManual,
  oficializarManual
};

