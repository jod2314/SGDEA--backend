/**
 * Servicio de Cálculos Archivísticos Oficiales para Fondos Acumulados (FDA)
 * Basado en normas del Archivo General de la Nación (AGN) de Colombia
 */

/**
 * 1. Proyección de Insumos y Materiales de Bioseguridad y Conservación
 * @param {number} metrosLineales - Cantidad total de metros lineales (m.l.)
 * @param {number} diasEstimados - Duración del proyecto de intervención en días
 * @param {number} auxiliares - Número de auxiliares archivísticos en campo
 */
function calcularInsumosProyecto(metrosLineales, diasEstimados = 30, auxiliares = 4) {
  const ml = Math.max(0, parseFloat(metrosLineales) || 0);
  const dias = Math.max(1, parseInt(diasEstimados) || 1);
  const aux = Math.max(1, parseInt(auxiliares) || 1);

  // Fórmulas oficiales de alistamiento
  const cajasX200 = Math.ceil(ml * 4.0); // 4 cajas por metro lineal
  const carpetas4Aletas = Math.ceil(ml * 24.0); // 24 carpetas propalcote por m.l.
  const rollosCintaAlgodon = Math.ceil(ml / 33.3); // 1 rollo de 100m por cada 33 m.l.
  
  // Elementos de Protección Personal (EPP) y Bioseguridad
  const tapabocasN95Unidades = aux * dias; // 1 mascarilla N95 por auxiliar cada día
  const cajasGuantesNitrilo100 = Math.ceil((aux * dias * 2) / 100); // 2 pares por aux/día, cajas x100
  const batasTyvek = aux * 2; // 2 batas lavables/desechables por auxiliar
  const lapicesHB = Math.ceil(aux * 2); // 2 lápices HB por auxiliar

  return {
    metrosLineales: ml,
    almacenamiento: {
      cajasX200,
      carpetas4Aletas,
      rollosCintaAlgodon
    },
    bioseguridadEPP: {
      tapabocasN95Unidades,
      cajasGuantesNitrilo100,
      batasTyvek,
      lapicesHB
    }
  };
}

/**
 * 2. Cálculo Muestral Estadístico para Diagnóstico Integral (DIA) - Ficha H-12
 * Fórmula para poblaciones finitas: n = (Z^2 * P * Q * N) / (E^2 * (N - 1) + Z^2 * P * Q)
 * @param {number} totalCarpetasPoblacion - N (Total de carpetas en el fondo)
 * @param {number} margenError - E (Ej: 0.08 para 8%)
 * @param {number} nivelConfianzaZ - Z (Ej: 1.96 para 95% de confianza)
 */
function calcularMuestraDIA(totalCarpetasPoblacion, margenError = 0.08, nivelConfianzaZ = 1.96) {
  const N = Math.max(1, parseInt(totalCarpetasPoblacion) || 0);
  if (N <= 0) return { muestraM: 0, poblacionN: 0 };

  const Z = parseFloat(nivelConfianzaZ) || 1.96;
  const E = parseFloat(margenError) || 0.08;
  const P = 0.50; // Probabilidad de deterioro
  const Q = 0.50; // Probabilidad de conservación sana

  const numerador = Math.pow(Z, 2) * P * Q * N;
  const denominador = (Math.pow(E, 2) * (N - 1)) + (Math.pow(Z, 2) * P * Q);
  const n = Math.ceil(numerador / denominador);

  return {
    poblacionTotalN: N,
    margenErrorUsado: E,
    nivelConfianzaZ: Z,
    muestraRequeridaCarpetasn: Math.min(N, n)
  };
}

module.exports = {
  calcularInsumosProyecto,
  calcularMuestraDIA
};
