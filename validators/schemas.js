const { z } = require("zod");

// --- Esquemas de Validación con Zod ---

// Esquema para Inventario (UnidadConservacion)
const inventarioSchema = z.object({
  empresa: z.string().optional(), // Se inyecta desde el token
  creadoPor: z.string().optional(),
  
  numeroOrden: z.number().int().positive().optional(),
  codigo: z.string().min(1, "El código es obligatorio para Archivo Central").optional(),
  asunto: z.string().min(3, "El asunto debe tener al menos 3 caracteres"),
  
  fechaInicial: z.string().or(z.date()).optional(), // Se puede refinar a formato fecha
  fechaFinal: z.string().or(z.date()).optional(),
  
  unidadConservacion: z.enum(['Caja', 'Carpeta', 'Tomo', 'Otro']),
  numeroCaja: z.string().optional(),
  numeroCarpeta: z.string().optional(),
  numeroFolios: z.number().int().nonnegative().optional(),
  
  soporte: z.string().default('Papel'),
  frecuenciaConsulta: z.enum(['Alta', 'Media', 'Baja']).default('Baja'),
});

// Esquema para Documento (Radicación)
const documentoSchema = z.object({
  tipoDocumento: z.enum(['Oficio', 'Acta', 'Factura', 'Contrato', 'Circular', 'Informe', 'Otro']),
  asunto: z.string().min(5, "El asunto es muy corto"),
  descripcion: z.string().optional(),
  
  remitente: z.string().optional(),
  destinatario: z.string().optional(),
  
  esDigital: z.boolean().default(false),
  
  // Validar si es digital que tenga datos de archivo, pero es condicional complejo
  // Por ahora validamos tipos básicos
  
  idTRDSerie: z.string().optional(),
  codigoTRDSerie: z.string().optional(),
  nombreTRDSerie: z.string().optional(),
});

// Esquema para Diagnóstico
const diagnosticoSchema = z.object({
  historiaInstitucional: z.string().optional(),
  estructuraAnterior: z.string().optional(),
  observaciones: z.string().optional(),
  
  fechasClave: z.array(z.object({
    fecha: z.string().or(z.date()),
    descripcion: z.string()
  })).optional(),
  
  organigramas: z.array(z.object({
    tipo: z.string(),
    descripcion: z.string().optional(),
    archivoUrl: z.string().optional()
  })).optional(),
  
  infraestructura: z.object({
    condicionFisica: z.string().optional(),
    temperatura: z.string().optional(),
    humedad: z.string().optional(),
    observaciones: z.string().optional()
  }).optional(),
  
  conteo: z.object({
    cajas: z.number().nonnegative().default(0),
    carpetas: z.number().nonnegative().default(0),
    tomos: z.number().nonnegative().default(0),
    otros: z.number().nonnegative().default(0)
  }).optional(),
  
  metrosLineales: z.number().nonnegative().optional(),
  
  insumosProyectados: z.object({
    cajasX200: z.number().nonnegative().optional(),
    carpetasYute: z.number().nonnegative().optional(),
    ganchosLegajadores: z.number().nonnegative().optional()
  }).optional(),
  
  estadoBiologico: z.object({
    porcentajeHongos: z.number().min(0).max(100).optional(),
    porcentajeInsectos: z.number().min(0).max(100).optional(),
    porcentajePolvo: z.number().min(0).max(100).optional()
  }).optional(),
  
  resumenCCDPropuesto: z.array(z.object({
    nivel: z.number().optional(),
    codigo: z.string().optional(),
    descripcion: z.string().optional()
  })).optional(),
});

// Esquema para TRD (Tabla de Retención Documental)
const trdSchema = z.object({
  nombre: z.string().min(3, "El nombre de la TRD es requerido"),
  items: z.array(z.object({
    codigoSerie: z.string().min(1, "El código de serie es requerido"),
    nombreSerie: z.string().min(1, "El nombre de serie es requerido"),
    
    codigoSubserie: z.string().optional(),
    nombreSubserie: z.string().optional(),
    
    retencionArchivoGestion: z.number().int().nonnegative("La retención debe ser positiva"),
    retencionArchivoCentral: z.number().int().nonnegative("La retención debe ser positiva"),
    
    disposicionFinal: z.enum(['CT', 'E', 'M', 'S'], {
      errorMap: () => ({ message: "La disposición final debe ser CT, E, M o S" })
    }),
    
    procedimiento: z.string().optional(),
    observaciones: z.string().optional()
  })).min(1, "La TRD debe tener al menos un item")
});

module.exports = {
  inventarioSchema,
  documentoSchema,
  diagnosticoSchema,
  trdSchema
};