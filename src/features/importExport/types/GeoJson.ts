export interface ParsedGeoJSON {
  features: any[];
  propertyKeys: string[];
  suggestedNameKey?: string;
}

export const flattenProperties = (
  obj: any,
  prefix = ""
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenProperties(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
};
