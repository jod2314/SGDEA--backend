const htmlPdf = require('html-pdf-node');
const crypto = require('crypto');
const Consecutivo = require('../schema/consecutivo');

/**
 * Genera el código TRD completo: [Dep]-[Ser]-[Sub]-[Ver]-[Consecutivo]-[Año]
 */
async function generarCodigoTRD(datos) {
  const { 
    empresaId, 
    codigoDep, 
    codigoSer, 
    codigoSub, 
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
  
  return `${codigoDep}-${codigoSer}-${codigoSub}-v${version}-${numConsecutivo}-${anio}`;
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
      <div style="flex: 0 0 100px; text-align: right; font-size: 8pt; color: #666;">
        ${trd ? `<div>Código: ${trd}</div>` : ''}
      </div>
    </div>
  `;

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
            margin: ${opciones.margen || '2.5cm'}; 
          }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          td, th { border: 1px solid #000; padding: 5px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .content { margin-top: 20px; }
        </style>
      </head>
      <body>
        ${encabezadoHtml}
        <div class="content">
          ${htmlConTokens}
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
