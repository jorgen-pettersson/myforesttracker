/**
 * Attribute Schema Types
 *
 * Defines the structure for attribute master definitions and import mappings.
 */

/**
 * Supported attribute types
 */
export type AttributeType = "text" | "number" | "select" | "boolean" | "date";

/**
 * Option for select-type attributes
 */
export interface SelectOption {
  code: string;
  label: string;
}

/**
 * Definition of a single attribute
 */
export interface AttributeDefinition {
  name: string;
  type: AttributeType;
  options?: SelectOption[]; // Required for type: "select"
}

/**
 * Master definition of all attributes
 */
export interface AttributeMaster {
  version: string;
  attributes: AttributeDefinition[];
}

/**
 * Mapping configuration for a single Forestand field
 */
export interface ForestandFieldMapping {
  mapping: string; // Internal attribute name
  codeTransformations: Record<string, string>; // Forestand code → Internal code
}

/**
 * Special case handling configuration
 */
export interface SpecialCaseMapping {
  description: string;
  mapsTo: string[]; // Array of internal attribute names
  useTransformationsFrom?: string; // Reference to another field's transformations
  extraction?: Record<string, string>; // Attribute → extraction description
}

/**
 * Forestand field to internal attribute mapping
 */
export interface ForestandMapping {
  version: string;
  source: string;
  description?: string;
  fieldMappings: Record<string, ForestandFieldMapping>; // Forestand field → mapping config
  specialCases?: Record<string, SpecialCaseMapping>; // Special handling documentation
}
