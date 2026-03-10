/**
 * Attribute Service
 *
 * Provides access to attribute master definitions.
 * This service is the central source of truth for all Place attributes.
 */

import attributeMaster from "../config/attributesMaster.json";
import {
  AttributeMaster,
  AttributeDefinition,
  SelectOption,
} from "../types/attributeSchema";

/**
 * Get all attribute definitions from the master
 */
export function getAttributeDefinitions(): AttributeDefinition[] {
  const master = attributeMaster as AttributeMaster;
  return master.attributes;
}

/**
 * Get a specific attribute definition by name
 */
export function getAttributeDefinition(
  name: string
): AttributeDefinition | null {
  const attrs = getAttributeDefinitions();
  return attrs.find((a) => a.name === name) || null;
}

/**
 * Get options for a select-type attribute
 * Returns empty array if attribute is not a select or doesn't exist
 */
export function getAttributeOptions(attributeName: string): SelectOption[] {
  const attr = getAttributeDefinition(attributeName);
  if (attr?.type === "select" && attr.options) {
    return attr.options;
  }
  return [];
}

/**
 * Get attribute type
 */
export function getAttributeType(attributeName: string): string | null {
  const attr = getAttributeDefinition(attributeName);
  return attr?.type || null;
}

/**
 * Check if attribute is a select type
 */
export function isSelectAttribute(attributeName: string): boolean {
  return getAttributeType(attributeName) === "select";
}

/**
 * Get all select-type attributes (useful for building forms)
 */
export function getSelectAttributes(): AttributeDefinition[] {
  return getAttributeDefinitions().filter((a) => a.type === "select");
}

/**
 * Get attribute options as a map keyed by attribute name
 * Useful for building multiple pickers at once
 */
export function getAllAttributeOptionsMap(): Record<string, SelectOption[]> {
  const result: Record<string, SelectOption[]> = {};
  const selectAttrs = getSelectAttributes();

  for (const attr of selectAttrs) {
    if (attr.options) {
      result[attr.name] = attr.options;
    }
  }

  return result;
}
