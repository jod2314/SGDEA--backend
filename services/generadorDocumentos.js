const htmlPdf = require('html-pdf-node');
const crypto = require('crypto');

/**
 * Función de utilidad para obtener un valor anidado de un objeto usando un path de string.
 * @param {Object} obj - El objeto fuente.
 * @param {string} path - El path (ej: "empresa.nombre").
 * @returns {*} - El valor encontrado o string vacío.
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
}

/**
 * Reemplaza todos los tokens {{key}} o {{nested.key}} en un string HTML.
 * @param {string} html - El HTML con tokens.
 * @param {Object} data - El objeto con los valores reales.
 * @returns {string} - HTML procesado.
 */
function procesarTokens(html, data) {
  return html.replace(/\{\{(.*?)\}\}/g, (match, token) => {
    const key = token.trim();
    return getNestedValue(data, key);
  });
}

/**
 * Calcula el hash SHA-256 de un buffer.
 * @param {Buffer} buffer 
 * @returns {string} - Hex string.
 */
function calcularHashIntegridad(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Genera un PDF a partir de una plantilla HTML y un set de datos.
 * 
 * @param {string} htmlContent - El contenido HTML de la plantilla (Tiptap).
 * @param {Object} data - Datos para la fusión (Maestros + Contexto).
 * @param {Object} options - Opciones de formato (márgenes NTC 3393).
 * @returns {Promise<{buffer: Buffer, hash: string, htmlFinal: string}>}
 */
async function generarPDFDocumental(htmlContent, data, options = {}) {
  // 1. Fusión de datos (Tokens)
  const htmlProcesado = procesarTokens(htmlContent, data);

  // 2. Envolver en estructura HTML completa con estilos base (NTC 3393 / Justificación)
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: ${options.marginTop || '30mm'} ${options.marginRight || '20mm'} ${options.marginBottom || '20mm'} ${options.marginLeft || '30mm'};
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          text-align: justify;
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td, th {
          border: 1px solid #ccc;
          padding: 5px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        img { max-width: 100%; }
        
        /* Pie de página de integridad */
        #footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 15mm;
          font-size: 8pt;
          color: #666;
          border-top: 0.5pt solid #eee;
          padding-top: 5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      ${htmlProcesado}
      <div id="footer">
        Documento emitido electrónicamente por SGDEA. <br/>
        Sello de Integridad (SHA-256): ${calcularHashIntegridad(Buffer.from(htmlProcesado))} <br/>
        Fecha de emisión: ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;

  // 3. Renderizar a PDF
  const file = { content: fullHtml };
  const pdfOptions = { 
    format: 'A4',
    printBackground: true
  };

  const buffer = await htmlPdf.generatePdf(file, pdfOptions);
  const hash = calcularHashIntegridad(buffer);

  return {
    buffer,
    hash,
    htmlFinal: fullHtml
  };
}

module.exports = {
  generarPDFDocumental,
  procesarTokens,
  calcularHashIntegridad
};
