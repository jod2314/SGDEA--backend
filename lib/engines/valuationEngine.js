const moment = require('moment'); // Asumimos que moment o date-fns podría ser útil, pero usaremos JS nativo para no depender

/**
 * Motor de Valoración Documental
 * Calcula fechas de disposición final y estados basados en la TRD.
 */
class ValuationEngine {
  
  /**
   * Calcula la fecha de disposición final para un expediente o unidad.
   * @param {Object} item - Objeto del inventario (UnidadConservacion)
   * @param {Object} trdItem - Item correspondiente de la TRD (Serie/Subserie)
   * @returns {Object} Resultado del cálculo { fechaDisposicion, accionSugerida, estado }
   */
  static calculateDisposition(item, trdItem) {
    if (!item.fechaFinal || !trdItem) {
      return { 
        calculable: false, 
        reason: "Faltan fechas extremas o TRD no asignada" 
      };
    }

    const fechaCierre = new Date(item.fechaFinal);
    const retencionGestion = trdItem.retencionArchivoGestion || 0; // Años
    const retencionCentral = trdItem.retencionArchivoCentral || 0; // Años
    const totalRetencion = retencionGestion + retencionCentral;

    // Calcular fecha exacta de fin de retención
    const fechaDisposicion = new Date(fechaCierre);
    fechaDisposicion.setFullYear(fechaDisposicion.getFullYear() + totalRetencion);

    const hoy = new Date();
    const tiempoRestante = fechaDisposicion - hoy;
    const diasRestantes = Math.ceil(tiempoRestante / (1000 * 60 * 60 * 24));

    let estado = '';
    let accionSugerida = '';

    if (diasRestantes > 0) {
      estado = 'VIGENTE';
      accionSugerida = 'Conservar';
    } else {
      estado = 'CUMPLIDO';
      // Mapear disposición final
      switch (trdItem.disposicionFinal) {
        case 'E': accionSugerida = 'Eliminar'; break;
        case 'CT': accionSugerida = 'Conservación Total (Patrimonio)'; break;
        case 'M': accionSugerida = 'Microfilmación/Digitalización'; break;
        case 'S': accionSugerida = 'Selección'; break;
        default: accionSugerida = 'Revisar TRD';
      }
    }

    return {
      calculable: true,
      fechaBase: fechaCierre,
      retencionTotalAños: totalRetencion,
      fechaDisposicionFinal: fechaDisposicion,
      diasRestantes,
      estado,
      accionSugerida
    };
  }

  /**
   * Procesa un lote de items y les anexa su valoración.
   * Útil para reportes masivos.
   */
  static async processBatch(items, trdItemsMap) {
    return items.map(item => {
      // Buscar la TRD correspondiente (asumiendo que item tiene codigos de serie)
      // Esta lógica depende de que el inventario tenga los códigos normalizados
      const key = `${item.codigoSerie}-${item.codigoSubserie || ''}`;
      const trdItem = trdItemsMap[key];
      
      const valuation = this.calculateDisposition(item, trdItem);
      return { ...item.toObject(), valuation };
    });
  }
}

module.exports = ValuationEngine;
