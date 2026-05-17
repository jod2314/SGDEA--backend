const fs = require('fs');
const path = require('path');

const NEW_SERIES = [
  {
    nombre: "ACTAS DE JUNTA DIRECTIVA",
    definicion: "Documentos que dan fe de los temas tratados y decisiones tomadas en las sesiones de la maxima autoridad de la empresa.",
    tipos: "Convocatoria, Acta firmada, Anexos técnicos",
    retGestion: 2,
    retCentral: 20,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "PLANES ESTRATEGICOS",
    definicion: "Documentos que definen el rumbo de la organizacion a largo plazo, incluyendo objetivos, metas y recursos.",
    tipos: "Plan estrategico, Cuadro de mando, Seguimiento a metas",
    retGestion: 5,
    retCentral: 10,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "INFORMES DE GESTION",
    definicion: "Reportes periodicos presentados por la gerencia sobre el cumplimiento de objetivos y estado de la empresa.",
    tipos: "Informe anual, Informe trimestral, Soportes de gestion",
    retGestion: 2,
    retCentral: 10,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "CONTRATOS COMERCIALES",
    definicion: "Acuerdos legales con clientes o aliados para la prestacion de servicios o venta de productos.",
    tipos: "Contrato firmado, Polizas, Propuesta comercial, Acta de inicio",
    retGestion: 2,
    retCentral: 10,
    disposicion: "Eliminacion"
  },
  {
    nombre: "PROCESOS JUDICIALES LABORALES",
    definicion: "Expedientes de demandas o litigios interpuestos por trabajadores o ex-trabajadores.",
    tipos: "Demanda, Contestacion, Pruebas, Sentencia",
    retGestion: 2,
    retCentral: 15,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "PROPIEDAD INTELECTUAL Y MARCAS",
    definicion: "Documentos relacionados con el registro y proteccion de marcas, patentes y derechos de autor.",
    tipos: "Titulo de registro, Solicitud ante SIC, Comprobante de pago",
    retGestion: 2,
    retCentral: 50,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "HISTORIAS LABORALES",
    definicion: "Expediente unico de cada trabajador donde se registra su vinculacion, desempeño y retiro.",
    tipos: "Contrato de trabajo, Afiliaciones, Evaluaciones, Liquidacion, Certificados",
    retGestion: 5,
    retCentral: 75,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "LIQUIDACIONES DE NOMINA",
    definicion: "Registros detallados de los pagos realizados a los trabajadores por concepto de salarios y prestaciones.",
    tipos: "Planilla de nomina, Comprobantes de pago, Soportes de horas extra",
    retGestion: 2,
    retCentral: 10,
    disposicion: "Eliminacion"
  },
  {
    nombre: "DECLARACIONES TRIBUTARIAS",
    definicion: "Documentos presentados ante la autoridad fiscal (DIAN) sobre el cumplimiento de obligaciones de impuestos.",
    tipos: "Declaracion de renta, IVA, Retencion en la fuente, ICA",
    retGestion: 2,
    retCentral: 8,
    disposicion: "Eliminacion"
  },
  {
    nombre: "LIBROS CONTABLES",
    definicion: "Libros oficiales donde se asientan cronologicamente las operaciones financieras de la empresa.",
    tipos: "Libro Diario, Libro Mayor, Libro de Inventarios",
    retGestion: 2,
    retCentral: 10,
    disposicion: "Conservacion Total"
  },
  {
    nombre: "COMPROBANTES DE CONTABILIDAD",
    definicion: "Documentos internos que soportan los asientos contables de la organizacion.",
    tipos: "Facturas de venta, Facturas de compra, Recibos de caja, Notas contables",
    retGestion: 2,
    retCentral: 10,
    disposicion: "Eliminacion"
  },
  {
    nombre: "EXPEDIENTES DE CLIENTES",
    definicion: "Agrupacion de documentos relacionados con la relacion comercial y seguimiento de cada cliente.",
    tipos: "Ficha de cliente, Cotizaciones, Ordenes de pedido, Correspondencia comercial",
    retGestion: 2,
    retCentral: 5,
    disposicion: "Eliminacion"
  },
  {
    nombre: "CAMPAÑAS DE MARKETING",
    definicion: "Documentacion sobre el diseño y ejecucion de estrategias publicitarias y promocionales.",
    tipos: "Brief, Piezas graficas, Informe de resultados",
    retGestion: 1,
    retCentral: 5,
    disposicion: "Seleccion"
  },
  {
    nombre: "EXPEDIENTES DE PROVEEDORES",
    definicion: "Documentos que soportan la seleccion, contratacion y evaluacion de proveedores de bienes y servicios.",
    tipos: "RUT, Certificacion bancaria, Evaluacion de desempeño",
    retGestion: 2,
    retCentral: 5,
    disposicion: "Eliminacion"
  },
  {
    nombre: "ORDENES DE COMPRA",
    definicion: "Documentos formales que autorizan la adquisicion de bienes o servicios a un proveedor.",
    tipos: "Orden de compra, Cotizaciones comparativas, Aprobacion presupuesto",
    retGestion: 2,
    retCentral: 5,
    disposicion: "Eliminacion"
  },
  {
    nombre: "MANUALES DE SISTEMAS",
    definicion: "Documentacion tecnica sobre el funcionamiento y administracion de la infraestructura tecnologica.",
    tipos: "Manual de usuario, Guia tecnica, Diccionario de datos",
    retGestion: 1,
    retCentral: 10,
    disposicion: "Medio Tecnico"
  },
  {
    nombre: "LICENCIAS DE SOFTWARE",
    definicion: "Registros de autorizacion y pago por el uso de aplicaciones informaticas y plataformas.",
    tipos: "Contrato de licencia, Certificado de autenticidad, Factura de compra",
    retGestion: 2,
    retCentral: 5,
    disposicion: "Eliminacion"
  },
  {
    nombre: "AUDITORIAS DE CALIDAD",
    definicion: "Expedientes sobre las revisiones internas y externas al sistema de gestion de calidad de la empresa.",
    tipos: "Plan de auditoria, Informe de hallazgos, Plan de mejora",
    retGestion: 2,
    retCentral: 8,
    disposicion: "Conservacion Total"
  }
];

function expandBanter() {
  const csvPath = path.join(__dirname, '..', '..', 'documentos apoyo', 'BANTER_Series_Subseries.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('No se encontro el archivo CSV base.');
    return;
  }

  let content = fs.readFileSync(csvPath, 'utf-8');
  let lines = content.split('\n');
  
  // Encontrar el ultimo codigo de serie
  let lastSerieCode = 0;
  for (let line of lines) {
    if (line.startsWith('SERIE;')) {
      const parts = line.split(';');
      const code = parseInt(parts[1]);
      if (code > lastSerieCode) lastSerieCode = code;
    }
  }

  console.log(`Ultimo codigo de serie detectado: ${lastSerieCode}`);
  
  let newRows = [];
  let currentCode = lastSerieCode + 1;

  for (const item of NEW_SERIES) {
    const codeStr = currentCode.toString().padStart(2, '0');
    
    const row = [
      "SERIE",
      codeStr,
      `"${item.nombre}"`,
      `"${item.definicion}"`,
      `"${item.tipos}"`,
      item.retGestion,
      item.retCentral,
      item.disposicion
    ];
    
    newRows.push(row.join(';'));
    currentCode++;
  }

  // Escribir al final del archivo
  fs.appendFileSync(csvPath, '\n' + newRows.join('\n'), 'utf-8');
  console.log(`Expansion completada. Se añadieron ${newRows.length} nuevas series universales.`);
}

expandBanter();
