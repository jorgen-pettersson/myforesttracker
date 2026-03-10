/**
 * Forestand Mapping Service
 *
 * Provides access to Forestand XML field name mappings.
 * Maps Forestand-specific field names (e.g., ObsS_MaturityClass) to internal attribute names.
 */

import forestandMapping from "../config/forestandMapping.json";
import {
  ForestandMapping,
  ForestandFieldMapping,
} from "../../inventory/types/attributeSchema";

/**
 * Load complete Forestand mapping configuration
 */
export function getForestandMapping(): ForestandMapping {
  return forestandMapping as ForestandMapping;
}

/**
 * Get mapping configuration for a specific Forestand field
 *
 * @param forestandField - Forestand XML field name (e.g., "ObsS_MaturityClass")
 * @returns Field mapping configuration or null if not mapped
 */
export function getForestandFieldMapping(
  forestandField: string
): ForestandFieldMapping | null {
  const mapping = getForestandMapping();
  return mapping.fieldMappings[forestandField] || null;
}

/**
 * Map Forestand field name to internal attribute name
 * Returns null if field should be ignored
 *
 * @param forestandField - Forestand XML field name (e.g., "ObsS_MaturityClass")
 * @returns Internal attribute name (e.g., "MaturityClass") or null if not mapped
 */
export function mapForestandFieldName(forestandField: string): string | null {
  const fieldMapping = getForestandFieldMapping(forestandField);
  return fieldMapping?.mapping || null;
}

/**
 * Transform a Forestand code to internal code
 * Returns original code if no transformation defined (passthrough)
 *
 * @param forestandField - Forestand XML field name
 * @param forestandCode - Code from Forestand XML
 * @returns Transformed internal code
 */
export function transformForestandCode(
  forestandField: string,
  forestandCode: string
): string {
  const fieldMapping = getForestandFieldMapping(forestandField);

  if (!fieldMapping?.codeTransformations) {
    // No transformations defined - passthrough with warning
    console.warn(
      `[ForestandMapping] No code transformations for ${forestandField}, using passthrough`
    );
    return forestandCode;
  }

  const internalCode = fieldMapping.codeTransformations[forestandCode];

  if (!internalCode) {
    // Code not in transformation map - passthrough with warning
    console.warn(
      `[ForestandMapping] Code ${forestandCode} not in transformation map for ${forestandField}, using passthrough`
    );
    return forestandCode;
  }

  return internalCode;
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
 * Check if a field has code transformations defined
 */
export function hasCodeTransformations(forestandField: string): boolean {
  const fieldMapping = getForestandFieldMapping(forestandField);
  return !!fieldMapping?.codeTransformations;
}

/**
 * Get all valid Forestand codes for a field
 * Useful for validation
 */
export function getValidForestandCodes(forestandField: string): string[] {
  const fieldMapping = getForestandFieldMapping(forestandField);
  return fieldMapping?.codeTransformations
    ? Object.keys(fieldMapping.codeTransformations)
    : [];
}

/**
 * Validate that a Forestand code is valid for a field
 */
export function validateForestandCode(
  forestandField: string,
  forestandCode: string
): boolean {
  const validCodes = getValidForestandCodes(forestandField);
  return validCodes.length === 0 || validCodes.includes(forestandCode);
}

/**
 * Get all mapped Forestand field names
 * Useful for debugging and validation
 */
export function getMappedForestandFields(): string[] {
  const mapping = getForestandMapping();
  return Object.keys(mapping.fieldMappings);
}

/**
 * Get all internal attribute names that Forestand can map to
 */
export function getMappedAttributeNames(): string[] {
  const mapping = getForestandMapping();
  return Object.values(mapping.fieldMappings).map((fm) => fm.mapping);
}
