const htmlPdf = require('html-pdf-node');
const crypto = require('crypto');

// Semáforo para controlar la concurrencia de Puppeteer y evitar el bloqueo del Event Loop
class Semaphore {
  constructor(max) {
    this.tasks = [];
    this.counter = max;
  }
  async acquire() {
    if (this.counter > 0) {
      this.counter--;
      return;
    }
    await new Promise(resolve => this.tasks.push(resolve));
  }
  release() {
    this.counter++;
    if (this.tasks.length > 0) {
      this.counter--;
      const nextTask = this.tasks.shift();
      nextTask();
    }
  }
}
const pdfSemaphore = new Semaphore(3); // Máximo 3 generaciones de PDF concurrentes

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
}

function procesarTokens(html, data) {
  return html.replace(/\{\{(.*?)\}\}/g, (match, token) => {
    const key = token.trim();
    const value = getNestedValue(data, key);
    return escapeHtml(value); // Sanitización de entrada (XSS)
  });
}

function calcularHashIntegridad(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function generarPDFDocumental(htmlContent, data, options = {}) {
  await pdfSemaphore.acquire();
  try {
    // 1. Fusión de datos (Tokens) sanitizados
    const htmlProcesado = procesarTokens(htmlContent, data);
    const radicadoStr = data.documento?.radicado || 'SIN-RADICADO';

    // 2. Envolver en estructura HTML completa. NO incluimos el Hash aquí para resolver la Paradoja.
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
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #ccc; padding: 5px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          img { max-width: 100%; }
          
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
          Radicado: <span class="bold">${escapeHtml(radicadoStr)}</span> <br/>
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
    
    // 4. Calcular el hash del BINARIO FINAL, garantizando la integridad legal del documento
    const hash = calcularHashIntegridad(buffer);

    return {
      buffer,
      hash,
      htmlFinal: fullHtml
    };
  } finally {
    pdfSemaphore.release();
  }
}

module.exports = {
  generarPDFDocumental,
  procesarTokens,
  calcularHashIntegridad
};
