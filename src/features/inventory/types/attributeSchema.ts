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
 * Forestand field to internal attribute mapping
 */
export interface ForestandMapping {
  version: string;
  source: string;
  fieldMappings: Record<string, string>; // Forestand field name → Internal attribute name
}
