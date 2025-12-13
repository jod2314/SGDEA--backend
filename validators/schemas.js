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

module.exports = {
  inventarioSchema,
  documentoSchema
};
