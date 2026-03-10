/**
 * Extract complete Forestand mapping with code transformations
 * from the old forestandSiteDefaultMapping.json structure
 */

const { execSync } = require("child_process");

// Get old mapping from git history
const oldMappingJson = execSync(
  "git show ce4a669~1:src/features/importExport/config/forestandSiteDefaultMapping.json",
  { encoding: "utf8" }
);

const oldMapping = JSON.parse(oldMappingJson);

const newMapping = {
  version: "1.0",
  source: "Forestand XML Schema",
  description:
    "Maps Forestand fields to internal attributes with explicit code transformations. All codes listed even when passthrough (Forestand code = Internal code) for validation and documentation purposes.",
  fieldMappings: {},
  specialCases: {
    ObsS_SIS: {
      description:
        "Site Index - Complex nested structure requiring special extraction logic",
      mapsTo: ["species", "speciesHeight"],
      useTransformationsFrom: "ObsS_Species",
      extraction: {
        species:
          "spec.species.code (transformed via ObsS_Species codeTransformations)",
        speciesHeight: "result.code (numeric passthrough)",
      },
    },
  },
};

// Extract all fields with attributeName
for (const [forestandField, config] of Object.entries(oldMapping)) {
  if (!config.attributeName || !config.codes) {
    continue;
  }

  // Build code transformations map
  const codeTransformations = {};
  for (const [forestandCode, meta] of Object.entries(config.codes)) {
    const internalCode = meta.internal?.code || forestandCode;
    codeTransformations[forestandCode] = internalCode;
  }

  // Only add if has codes
  if (Object.keys(codeTransformations).length > 0) {
    newMapping.fieldMappings[forestandField] = {
      mapping: config.attributeName,
      codeTransformations: codeTransformations,
    };
  }
}

// Manually add ObsS_Species with user-friendly codes
newMapping.fieldMappings["ObsS_Species"] = {
  mapping: "species",
  codeTransformations: {
    1: "T",
    2: "G",
    3: "B",
    10: "C",
    20: "E",
    21: "F",
  },
};

// Sort by field name for readability
const sortedFieldMappings = {};
const sortedKeys = Object.keys(newMapping.fieldMappings).sort();
for (const key of sortedKeys) {
  sortedFieldMappings[key] = newMapping.fieldMappings[key];
}
newMapping.fieldMappings = sortedFieldMappings;

// Output
console.log(JSON.stringify(newMapping, null, 2));

// Stats to stderr
console.error(
  `\nExtracted ${Object.keys(newMapping.fieldMappings).length} field mappings`
);
let totalCodes = 0;
for (const config of Object.values(newMapping.fieldMappings)) {
  totalCodes += Object.keys(config.codeTransformations).length;
}
console.error(`Total code transformations: ${totalCodes}`);
