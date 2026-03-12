import populationAttributeMaster from "../config/populationAttributeMaster.json";

export interface PopulationSelectOption {
  code: string;
  label: string;
}

export interface PopulationAttributeDefinition {
  name: string;
  type: string;
  options?: PopulationSelectOption[];
}

export interface PopulationAttributeMaster {
  version: string;
  attributes: PopulationAttributeDefinition[];
}

export function getPopulationAttributeDefinitions(): PopulationAttributeDefinition[] {
  const master = populationAttributeMaster as PopulationAttributeMaster;
  return master.attributes;
}

export function getPopulationAttributeDefinition(
  name: string
): PopulationAttributeDefinition | null {
  const attrs = getPopulationAttributeDefinitions();
  return attrs.find((a) => a.name === name) || null;
}

export function getPopulationAttributeOptions(
  attributeName: string
): PopulationSelectOption[] {
  const attr = getPopulationAttributeDefinition(attributeName);
  if (attr?.type === "select" && attr.options) {
    return attr.options;
  }
  return [];
}
