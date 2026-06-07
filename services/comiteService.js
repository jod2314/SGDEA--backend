const ComiteArchivo = require('../schema/comiteArchivo');
const ActaComite = require('../schema/actaComite');
const Empresa = require('../schema/empresa');
const HistorialDocumento = require('../schema/historialDocumento');
const { generarPDFDocumental } = require('./generadorDocumentos');
const { registrarAuditoria } = require('../lib/audit');

/**
 * Crea un nuevo Comité de Archivo para una empresa.
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} comiteData - Datos del comité (nombre, descripcion, miembros).
 * @param {string} usuarioId - ID del usuario creador.
 * @param {Object} req - Request de Express para auditoría.
 */
async function crearComite(empresaId, comiteData, usuarioId, req) {
  const comite = new ComiteArchivo({
    empresaId,
    nombre: comiteData.nombre,
    descripcion: comiteData.descripcion,
    miembros: comiteData.miembros,
    estado: 'activo'
  });

  await comite.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_COMITE_ARCHIVO',
    tipoRecurso: 'COMITE',
    recursoId: comite._id,
    detalles: { nombre: comite.nombre },
    req
  });

  return comite;
}

/**
 * Actualiza un Comité de Archivo existente.
 * @param {string} comiteId - ID del comité a actualizar.
 * @param {string} empresaId - ID de la empresa (aislamiento multi-tenant).
 * @param {Object} comiteData - Datos actualizados del comité.
 * @param {string} usuarioId - ID del usuario que edita.
 * @param {Object} req - Request de Express para auditoría.
 */
async function actualizarComite(comiteId, empresaId, comiteData, usuarioId, req) {
  const comite = await ComiteArchivo.findOne({ _id: comiteId, empresaId });
  if (!comite) {
    throw new Error('Comité de archivo no encontrado o no pertenece a la empresa.');
  }

  if (comiteData.nombre !== undefined) comite.nombre = comiteData.nombre;
  if (comiteData.descripcion !== undefined) comite.descripcion = comiteData.descripcion;
  if (comiteData.miembros !== undefined) comite.miembros = comiteData.miembros;
  if (comiteData.estado !== undefined) comite.estado = comiteData.estado;

  await comite.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'ACTUALIZAR_COMITE_ARCHIVO',
    tipoRecurso: 'COMITE',
    recursoId: comite._id,
    detalles: { nombre: comite.nombre, estado: comite.estado },
    req
  });

  return comite;
}

/**
 * Obtiene todos los comités de archivo de una empresa.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerComites(empresaId) {
  return await ComiteArchivo.find({ empresaId });
}

/**
 * Obtiene un comité de archivo por su ID y empresa.
 * @param {string} comiteId - ID del comité.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerComitePorId(comiteId, empresaId) {
  return await ComiteArchivo.findOne({ _id: comiteId, empresaId }).populate('miembros.usuarioId', 'nombre email');
}

/**
 * Crea una nueva acta de comité para un comité específico.
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} actaData - Datos del acta (comiteId, numeroActa, fechaReunion, temasTratados, desarrollo, compromisos).
 * @param {string} usuarioId - ID del usuario creador.
 * @param {Object} req - Request de Express para auditoría.
 */
async function crearActaComite(empresaId, actaData, usuarioId, req) {
  // Validar que el comité existe y pertenece a la empresa
  const comite = await ComiteArchivo.findOne({ _id: actaData.comiteId, empresaId });
  if (!comite) {
    throw new Error('El comité de archivo especificado no existe o no pertenece a la empresa.');
  }

  const acta = new ActaComite({
    empresaId,
    comiteId: actaData.comiteId,
    numeroActa: actaData.numeroActa,
    fechaReunion: actaData.fechaReunion,
    temasTratados: actaData.temasTratados || [],
    desarrollo: actaData.desarrollo,
    compromisos: actaData.compromisos || [],
    tipo: actaData.tipo || 'ORDINARIA',
    estado: 'borrador'
  });

  await acta.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'CREAR_ACTA_COMITE',
    tipoRecurso: 'ACTA_COMITE',
    recursoId: acta._id,
    detalles: { numeroActa: acta.numeroActa, comiteId: acta.comiteId },
    req
  });

  return acta;
}

/**
 * Actualiza una acta de comité en estado borrador.
 * @param {string} actaId - ID del acta a actualizar.
 * @param {string} empresaId - ID de la empresa.
 * @param {Object} actaData - Datos a actualizar en el acta.
 * @param {string} usuarioId - ID del usuario que edita.
 * @param {Object} req - Request de Express para auditoría.
 */
async function actualizarActaComite(actaId, empresaId, actaData, usuarioId, req) {
  const acta = await ActaComite.findOne({ _id: actaId, empresaId });
  if (!acta) {
    throw new Error('Acta de comité no encontrada o no pertenece a la empresa.');
  }

  if (acta.estado !== 'borrador') {
    throw new Error('Únicamente se pueden editar actas en estado borrador.');
  }

  if (actaData.numeroActa !== undefined) acta.numeroActa = actaData.numeroActa;
  if (actaData.fechaReunion !== undefined) acta.fechaReunion = actaData.fechaReunion;
  if (actaData.temasTratados !== undefined) acta.temasTratados = actaData.temasTratados;
  if (actaData.desarrollo !== undefined) acta.desarrollo = actaData.desarrollo;
  if (actaData.compromisos !== undefined) acta.compromisos = actaData.compromisos;

  await acta.save();

  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'ACTUALIZAR_ACTA_COMITE',
    tipoRecurso: 'ACTA_COMITE',
    recursoId: acta._id,
    detalles: { numeroActa: acta.numeroActa },
    req
  });

  return acta;
}

/**
 * Obtiene todas las actas de comité de un comité específico en una empresa.
 * @param {string} comiteId - ID del comité.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerActasComite(comiteId, empresaId) {
  return await ActaComite.find({ comiteId, empresaId }).sort({ fechaReunion: -1 });
}

/**
 * Obtiene todas las actas de comité de una empresa.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerActasPorEmpresa(empresaId) {
  return await ActaComite.find({ empresaId }).populate('comiteId', 'nombre').sort({ fechaReunion: -1 });
}

/**
 * Obtiene un acta de comité por su ID y empresa.
 * @param {string} actaId - ID del acta.
 * @param {string} empresaId - ID de la empresa.
 */
async function obtenerActaPorId(actaId, empresaId) {
  return await ActaComite.findOne({ _id: actaId, empresaId })
    .populate({
      path: 'comiteId',
      populate: { path: 'miembros.usuarioId', select: 'nombre email' }
    })
    .populate('compromisos.responsableId', 'nombre email')
    .populate('anexo.docRefId');
}

/**
 * Oficializa un acta de comité generando su PDF inmutable y registrándolo en HistorialDocumento.
 * @param {string} actaId - ID del acta.
 * @param {string} empresaId - ID de la empresa.
 * @param {string} usuarioId - ID del usuario que oficializa.
 * @param {Object} req - Request de Express para auditoría.
 */
async function oficializarActaComite(actaId, empresaId, usuarioId, req) {
  const acta = await ActaComite.findOne({ _id: actaId, empresaId })
    .populate({
      path: 'comiteId',
      populate: { path: 'miembros.usuarioId', select: 'nombre email' }
    })
    .populate('compromisos.responsableId', 'nombre email');

  if (!acta) {
    throw new Error('Acta de comité no encontrada o no pertenece a la empresa.');
  }

  if (acta.estado !== 'borrador') {
    throw new Error('Solo se pueden oficializar actas que se encuentren en estado borrador.');
  }

  const empresa = await Empresa.findById(empresaId);
  if (!empresa) {
    throw new Error('Empresa asociada no encontrada.');
  }

  const fechaActualFormateada = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fechaReunionFormateada = new Date(acta.fechaReunion).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generación de la plantilla HTML en español colombiano con estructura NTC 3393
  const htmlContent = `
    <div style="border: 1px solid #000; padding: 20px; margin-bottom: 20px;">
      <h1 class="text-center" style="margin-top: 0; font-size: 16pt; text-align: center;">${empresa.razonSocial.toUpperCase()}</h1>
      ${empresa.nit ? `<p class="text-center" style="font-size: 10pt; margin: 0; text-align: center;">NIT: ${empresa.nit}</p>` : ''}
      <h2 class="text-center" style="font-size: 14pt; margin-top: 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; text-align: center;">
        ACTA DE COMITÉ DE ARCHIVO No. ${acta.numeroActa}
      </h2>
    </div>

    <table style="width: 100%; border: none; margin-bottom: 20px; font-size: 11pt;">
      <tr>
        <td style="width: 25%; font-weight: bold; border: none; padding: 4px 0;">Comité:</td>
        <td style="border: none; padding: 4px 0;">${acta.comiteId.nombre}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; border: none; padding: 4px 0;">Fecha y Hora:</td>
        <td style="border: none; padding: 4px 0;">${fechaReunionFormateada}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; border: none; padding: 4px 0;">Lugar / Medio:</td>
        <td style="border: none; padding: 4px 0;">Instalaciones de la Entidad / Sesión Virtual</td>
      </tr>
    </table>

    <h3 style="border-bottom: 1px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 25px;">1. PARTICIPANTES Y MIEMBROS</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nombre</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Cargo</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Rol en Comité</th>
        </tr>
      </thead>
      <tbody>
        ${acta.comiteId.miembros.map(m => `
          <tr>
            <td style="border: 1px solid #000; padding: 8px;">${m.usuarioId ? m.usuarioId.nombre : 'Invitado/Externo'}</td>
            <td style="border: 1px solid #000; padding: 8px;">${m.cargo}</td>
            <td style="border: 1px solid #000; padding: 8px;">${m.rolComite}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3 style="border-bottom: 1px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 25px;">2. ORDEN DEL DÍA / TEMAS TRATADOS</h3>
    <ol style="margin-top: 10px; padding-left: 20px;">
      ${acta.temasTratados.map(tema => `
        <li style="margin-bottom: 8px;">${tema}</li>
      `).join('')}
    </ol>

    <h3 style="border-bottom: 1px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 25px;">3. DESARROLLO DE LA SESIÓN</h3>
    <div style="margin-top: 10px; text-align: justify; white-space: pre-wrap; line-height: 1.6;">${acta.desarrollo}</div>

    <h3 style="border-bottom: 1px solid #000; padding-bottom: 3px; font-size: 12pt; margin-top: 25px;">4. COMPROMISOS Y TAREAS ASIGNADAS</h3>
    ${acta.compromisos && acta.compromisos.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 50%;">Compromiso / Descripción</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 25%;">Responsable</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 25%;">Fecha Límite</th>
          </tr>
        </thead>
        <tbody>
          ${acta.compromisos.map(c => `
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">${c.descripcion}</td>
              <td style="border: 1px solid #000; padding: 8px;">${c.responsableId ? c.responsableId.nombre : 'No asignado'}</td>
              <td style="border: 1px solid #000; padding: 8px;">${c.fechaLimite ? new Date(c.fechaLimite).toLocaleDateString('es-CO') : 'No establecida'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="margin-top: 10px;">No se establecieron compromisos o tareas de seguimiento en esta reunión.</p>'}

    <div style="margin-top: 60px;">
      <p style="font-size: 10pt; text-align: center; color: #555;">
        Para constancia del quórum, deliberaciones y acuerdos correspondientes, firman los integrantes del Comité de Archivo.<br/>
        Documento oficializado el día ${fechaActualFormateada}.
      </p>
    </div>
  `;

  // Fusión de contexto para el generador base de PDF
  const dataContext = {
    maestros: { membrete: { razonSocial: empresa.razonSocial, nit: empresa.nit } },
    entidad: { ciudad: empresa.ciudad || 'Bogotá' },
    documento: { radicado: acta.numeroActa, fecha: new Date(acta.fechaReunion).toLocaleDateString('es-CO') }
  };

  // Generar PDF inmutable con su sello SHA-256
  const { buffer, hash } = await generarPDFDocumental(htmlContent, dataContext);

  // Crear registro inmutable en el Historial de Documentos
  const registroDoc = new HistorialDocumento({
    plantillaId: null,
    empresaId,
    usuarioId,
    datosUsados: {
      actaId: acta._id,
      numeroActa: acta.numeroActa,
      fechaReunion: acta.fechaReunion,
      temasTratados: acta.temasTratados,
      desarrollo: acta.desarrollo,
      compromisos: acta.compromisos,
      comite: {
        nombre: acta.comiteId.nombre,
        miembros: acta.comiteId.miembros
      }
    },
    hashIntegridad: hash,
    numeroRadicado: `ACTA-${acta.numeroActa}`,
    tipoArchivo: 'PDF'
  });
  await registroDoc.save();

  // Actualizar acta con la referencia al historial e inmutabilidad
  acta.estado = 'aprobada';
  acta.anexo = {
    docRefId: registroDoc._id,
    url: `/api/comites/actas/${acta._id}/pdf`
  };
  await acta.save();

  // Loguear en auditoría la oficialización del documento probatorio
  await registrarAuditoria({
    empresaId,
    usuarioId,
    accion: 'OFICIALIZAR_ACTA_COMITE',
    tipoRecurso: 'ACTA_COMITE',
    recursoId: acta._id,
    detalles: { numeroActa: acta.numeroActa, hashIntegridad: hash },
    req
  });

  return {
    acta,
    buffer,
    hash
  };
}

module.exports = {
  crearComite,
  actualizarComite,
  obtenerComites,
  obtenerComitePorId,
  crearActaComite,
  actualizarActaComite,
  obtenerActasComite,
  obtenerActasPorEmpresa,
  obtenerActaPorId,
  oficializarActaComite
};
