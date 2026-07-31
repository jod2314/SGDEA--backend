class ActasGeneratorService {
  static generarActaConformacionHTML(miembros) {
    let miembrosHtml = miembros.map(m => `<li>${m.nombre} - ${m.cargo} (CC: ${m.cedula})</li>`).join('');
    return `
      <html>
        <head><title>Acta de Conformación de Comité</title></head>
        <body>
          <h1>Acta de Conformación de Comité de Archivo</h1>
          <p>Por medio de la presente se deja constancia de la conformación del comité de archivo con los siguientes miembros:</p>
          <ul>${miembrosHtml}</ul>
          <p>Fecha: ${new Date().toLocaleDateString()}</p>
        </body>
      </html>
    `;
  }

  static generarActaAprobacionTVDHTML(miembros) {
    let miembrosHtml = miembros.map(m => `<li>${m.nombre} - ${m.cargo} (CC: ${m.cedula})</li>`).join('');
    return `
      <html>
        <head><title>Acta de Aprobación de TVD</title></head>
        <body>
          <h1>Acta de Aprobación de Tablas de Valoración Documental (TVD)</h1>
          <p>El comité de archivo, conformado por los siguientes miembros:</p>
          <ul>${miembrosHtml}</ul>
          <p>Aprueba en la fecha ${new Date().toLocaleDateString()} las Tablas de Valoración Documental (TVD).</p>
        </body>
      </html>
    `;
  }

  static generarActaBase64(tipoActa, miembros) {
    let html = '';
    if (tipoActa === 'CONFORMACION_COMITE') {
      html = this.generarActaConformacionHTML(miembros);
    } else if (tipoActa === 'APROBACION_TVD') {
      html = this.generarActaAprobacionTVDHTML(miembros);
    } else {
      throw new Error('Tipo de acta no válido');
    }
    return Buffer.from(html).toString('base64');
  }
}

module.exports = ActasGeneratorService;
