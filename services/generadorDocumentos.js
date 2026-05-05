const htmlPdf = require('html-pdf-node');
const crypto = require('crypto');
const Consecutivo = require('../schema/consecutivo');

/**
 * Genera el código TRD completo y retorna un objeto con detalles archivísticos.
 */
async function generarCodigoTRD(datos) {
  const { 
    empresaId, 
    codigoDep, 
    nombreDep,
    codigoSer, 
    nombreSer,
    codigoSub, 
    nombreSub,
    version, 
    anio 
  } = datos;

  const key = `${codigoDep}-${codigoSer}-${codigoSub}-${anio}`;
  
  const consecutivoDoc = await Consecutivo.findOneAndUpdate(
    { empresaId, key },
    { $inc: { valor: 1 } },
    { upsert: true, new: true }
  );

  const numConsecutivo = consecutivoDoc.valor.toString().padStart(4, '0');
  const codigoCompleto = `${codigoDep}-${codigoSer}-${codigoSub}-v${version}-${numConsecutivo}-${anio}`;

  return {
    codigo: codigoCompleto,
    dependencia: nombreDep,
    serie: nombreSer,
    subserie: nombreSub,
    consecutivo: numConsecutivo,
    anio: anio
  };
}

/**
 * Aplana un objeto JSON para facilitar el reemplazo de tokens.
 * Convierte { cliente: { nombre: 'Juan' } } en { 'cliente.nombre': 'Juan' }
 */
function aplanarObjeto(obj, prefijo = '') {
  let resultado = {};
  for (let clave in obj) {
    if (typeof obj[clave] === 'object' && obj[clave] !== null && !Array.isArray(obj[clave])) {
      const aplanado = aplanarObjeto(obj[clave], prefijo + clave + '.');
      resultado = { ...resultado, ...aplanado };
    } else {
      resultado[prefijo + clave] = obj[clave];
    }
  }
  return resultado;
}

/**
 * Reemplaza los tokens {{variable}} en un string HTML con los valores correspondientes.
 */
function reemplazarTokens(html, datos) {
  const datosAplanados = aplanarObjeto(datos);
  let htmlFinal = html;

  for (const [clave, valor] of Object.entries(datosAplanados)) {
    const regex = new RegExp(`\\{\\{${clave}\\}\\}`, 'g');
    htmlFinal = htmlFinal.replace(regex, valor !== undefined ? valor : '');
  }

  // Limpiar tokens no resueltos (opcional)
  htmlFinal = htmlFinal.replace(/\{\{.*?\}\}/g, '');

  return htmlFinal;
}

/**
 * Resuelve la identidad para el encabezado según NTC 3393
 */
function obtenerDatosIdentidad(empresa) {
  const esNatural = empresa.tipoPersona === 'natural';
  const nombreCompleto = `${empresa.nombres || ''} ${empresa.primerApellido || ''} ${empresa.segundoApellido || ''}`.trim();

  return {
    lineaPrincipal: esNatural ? (empresa.nombreComercial || nombreCompleto) : empresa.razonSocial,
    lineaSecundaria: (esNatural && empresa.nombreComercial) ? nombreCompleto : (empresa.sigla || ''),
    identificacion: `${esNatural ? (empresa.tipoDocumentoId || 'CC') : 'NIT'}: ${empresa.nit}${empresa.digitoVerificacion ? '-' + empresa.digitoVerificacion : ''}`
  };
}

/**
 * Genera un PDF a partir de HTML, inyectando estilos base, encabezado dinámico y calculando su hash.
 */
async function generarPdf(contenidoHtml, datos, opciones = {}) {
  const { empresa, trd } = datos;
  const identidad = obtenerDatosIdentidad(empresa);
  
  const htmlConTokens = reemplazarTokens(contenidoHtml, datos);

  // Construir el encabezado
  const encabezadoHtml = `
    <div style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; align-items: center;">
      ${empresa.logo ? `<div style="flex: 0 0 ${empresa.logoAnchoMm || 60}mm;"><img src="${empresa.logo}" style="height: ${empresa.logoAlturaMm || 25}mm; width: auto;"></div>` : ''}
      <div style="flex: 1; text-align: center;">
        <div style="font-weight: bold; font-size: 14pt;">${identidad.lineaPrincipal}</div>
        ${identidad.lineaSecundaria ? `<div style="font-size: 10pt;">${identidad.lineaSecundaria}</div>` : ''}
        <div style="font-size: 11pt;">${identidad.identificacion}</div>
      </div>
      <div style="flex: 0 0 120px; text-align: right; font-size: 7pt; color: #333; line-height: 1.2;">
        ${trd ? `
          <div style="font-weight: bold; color: #000; margin-bottom: 2px;">CÓDIGO ARCHIVÍSTICO</div>
          <div>${trd.codigo || trd}</div>
          <div style="margin-top: 4px; font-style: italic;">${trd.dependencia || ''}</div>
        ` : ''}
      </div>
    </div>
  `;

  // Calcular Hash preliminar para el pie de página (basado en el contenido)
  // Nota: El hash final se calcula sobre el PDF buffer, pero el del HTML ayuda a trazabilidad
  const contentHash = crypto.createHash('sha256').update(htmlConTokens).digest('hex').substring(0, 16);

  // Inyectar estilos base para asegurar justificación y márgenes
  const fullHtml = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: '${empresa.configuracion?.tipografia || 'Arial'}', sans-serif; 
            text-align: justify; 
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 0;
          }
          @page { 
            size: ${opciones.formato || 'Letter'}; 
            margin: 2.5cm 2cm 3cm 2cm; 
          }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          td, th { border: 1px solid #000; padding: 5px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .content { margin-top: 20px; padding-bottom: 50px; }
          .footer-integrity {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            font-size: 7pt;
            color: #777;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 10px;
            background: white;
          }
        </style>
      </head>
      <body>
        ${encabezadoHtml}
        <div class="content">
          ${htmlConTokens}
        </div>
        <div class="footer-integrity">
          SGDEA - Sello de Integridad Digital: <strong>${contentHash.toUpperCase()}</strong> | 
          Verificable mediante Hash SHA-256 original | 
          Emitido: ${new Date().toLocaleString('es-CO')}
        </div>
      </body>
    </html>
  `;

  const file = { content: fullHtml };
  const pdfOptions = { 
    format: opciones.formato || 'A4',
    printBackground: true
  };

  const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);

  // Calcular Hash SHA-256 para integridad
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  return {
    buffer: pdfBuffer,
    hash: hash,
    htmlFinal: htmlConTokens
  };
}

module.exports = {
  generarPdf,
  reemplazarTokens,
  generarCodigoTRD
};
