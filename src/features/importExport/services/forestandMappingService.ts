/**
 * Forestand Mapping Service
 *
 * Provides access to Forestand XML field name mappings.
 * Maps Forestand-specific field names (e.g., ObsS_MaturityClass) to internal attribute names.
 */

import forestandMapping from "../config/forestandMapping.json";
import { ForestandMapping } from "../../inventory/types/attributeSchema";

/**
 * Load Forestand mapping configuration
 */
export function getForestandMapping(): Record<string, string> {
  const mapping = forestandMapping as ForestandMapping;
  return mapping.fieldMappings;
}

/**
 * Map Forestand field name to internal attribute name
 * Returns null if field should be ignored
 *
 * @param forestandField - Forestand XML field name (e.g., "ObsS_MaturityClass")
 * @returns Internal attribute name (e.g., "MaturityClass") or null if not mapped
 */
export function mapForestandFieldName(forestandField: string): string | null {
  const mappings = getForestandMapping();
  return mappings[forestandField] || null;
}

/**
 * Check if Forestand field should be processed during import
 *
 * @param forestandField - Forestand XML field name
 * @returns true if field should be processed, false if it should be ignored
 */
export function shouldProcessField(forestandField: string): boolean {
  return mapForestandFieldName(forestandField) !== null;
}

/**
 * Get all mapped Forestand field names
 * Useful for debugging and validation
 */
export function getMappedForestandFields(): string[] {
  return Object.keys(getForestandMapping());
}

/**
 * Get all internal attribute names that Forestand can map to
 */
export function getMappedAttributeNames(): string[] {
  return Object.values(getForestandMapping());
}
