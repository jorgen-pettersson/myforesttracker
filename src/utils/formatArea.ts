/**
 * Format area in m² with hectares
 * @param areaM2 - Area in square meters
 * @returns Formatted string like "1234.56 m² (0.12 ha)"
 */
export function formatArea(areaM2: number): string {
  const hectares = areaM2 / 10000;
  return `${areaM2.toFixed(2)} m² (${hectares.toFixed(2)} ha)`;
}
