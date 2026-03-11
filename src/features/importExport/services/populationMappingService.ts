/**
 * Population Mapping Service
 *
 * Provides mapping for Forestand Object_Population observations (ObsP_*)
 * to internal attribute names.
 */

import populationMapping from "../config/populationMapping.json";

interface PopulationMapping {
  version: string;
  source: string;
  description?: string;
  observationMappings: Record<string, string>;
}

/**
 * Get population mapping configuration
 */
export function getPopulationMapping(): PopulationMapping {
  return populationMapping as PopulationMapping;
}

/**
 * Map Forestand ObsP_* observation name to internal attribute name
 *
 * @param obsName - Forestand observation name (e.g., "ObsP_MeanHeight")
 * @returns Internal attribute name (e.g., "meanHeight") or null if not mapped
 */
export function mapPopulationObservation(obsName: string): string | null {
  const mapping = getPopulationMapping();
  return mapping.observationMappings[obsName] || null;
}

/**
 * Check if observation should be mapped to internal attributes
 *
 * @param obsName - Forestand observation name
 * @returns true if observation has a mapping, false otherwise
 */
export function shouldMapObservation(obsName: string): boolean {
  return mapPopulationObservation(obsName) !== null;
}

/**
 * Get all mapped Forestand observation names
 * Useful for validation and documentation
 */
export function getMappedObservations(): string[] {
  const mapping = getPopulationMapping();
  return Object.keys(mapping.observationMappings);
}

/**
 * Get all internal attribute names for population measurements
 */
export function getInternalPopulationAttributes(): string[] {
  const mapping = getPopulationMapping();
  return Object.values(mapping.observationMappings);
}
