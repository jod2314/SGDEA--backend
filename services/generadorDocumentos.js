const htmlPdf = require('html-pdf-node');
const crypto = require('crypto');

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
 * Genera un PDF a partir de HTML, inyectando estilos base y calculando su hash.
 */
async function generarPdf(contenidoHtml, datos, opciones = {}) {
  const htmlConTokens = reemplazarTokens(contenidoHtml, datos);

  // Inyectar estilos base para asegurar justificación y márgenes
  const fullHtml = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            text-align: justify; 
            line-height: 1.5;
            color: #000;
          }
          @page { 
            size: ${opciones.formato || 'A4'}; 
            margin: ${opciones.margen || '2.5cm'}; 
          }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          td, th { border: 1px solid #000; padding: 5px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlConTokens}
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
  reemplazarTokens
};
