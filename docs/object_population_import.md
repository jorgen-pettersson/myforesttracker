# Object_Population Import from Forestand XML

## Overview

Object_Population elements are extracted from Forestand XML and stored in `properties.forestand.population[]` as an array of population objects.

## Source Structure

```xml
<sis:Place_Compartment>
  <sis:object>
    <sis:Object_Population gml:id="G403">
      <sis:treeLayer>produktionsskikt</sis:treeLayer>
      <sis:treeSpecies>E1_1_1</sis:treeSpecies>
      <sis:obs>
        <sis:ObsP_AreaWeightedAge gml:id="G404">
          <sis:result uom="year">120</sis:result>
        </sis:ObsP_AreaWeightedAge>
      </sis:obs>
      <!-- More observations... -->
    </sis:Object_Population>
  </sis:object>
</sis:Place_Compartment>
```

## Output Structure

```json
{
  "properties": {
    "forestand": {
      "placeType": "Place_Compartment",
      "site": {
        /* Object_Site data */
      },
      "population": [
  {
    "treeLayer": "produktionsskikt",
    "treeSpecies": "E1_1_1",
    "areaWeightedAge": { "value": 120, "unit": "year" },
    "meanHeight": { "value": 21.86, "unit": "m" },
    "weightedDiameter": { "value": 28.97, "unit": "cm" },
    "standBasalArea": { "value": 23.00, "unit": "m2" },
    "areaStandVolume": { "value": 237.00, "unit": "m3_per_ha" },
    "areaStemNumber": { "value": 400, "unit": "per_ha" }
  }
        }
      ]
    }
  }
}
```

## Observed ObsP\_\* Observation Types

From sample Forestand XML (`exempel_ok_bestandsregister.xml`):

| Observation Type                 | Unit      | Description                    |
| -------------------------------- | --------- | ------------------------------ |
| `ObsP_AreaWeightedAge`           | year      | Area-weighted average age      |
| `ObsP_WeightedDiameter`          | cm        | Weighted diameter              |
| `ObsP_MeanHeight`                | m         | Mean height                    |
| `ObsP_StandBasalArea`            | m2        | Stand basal area               |
| `ObsP_AreaStandVolume`           | m3_per_ha | Area stand volume per hectare  |
| `ObsP_AreaStemNumber`            | per_ha    | Number of stems per hectare    |
| `ObsP_SpeciesDistributionVolume` | -         | Species distribution by volume |

## Implementation Details

### Function: `extractObjectPopulation(place)`

**Located in:** `src/features/importExport/services/forestandLocal.ts`

**Process:**

1. Find all `Object_Population` elements in Place
2. For each Object_Population:
   - Extract `treeLayer` (string)
   - Extract `treeSpecies` (string, optional) or `treeSpecies_ref` (xlink:href)
   - Extract all `ObsP_*` observations using existing `extractObsResult` logic
   - Extract `gml:id` as `objectPopulationId`
3. Return array of population objects or null

**Key Design:**

- **Reuses** `extractObsResult()` - works for both ObsS*\* and ObsP*\*
- **No code duplication** - same observation extraction logic
- **Consistent structure** - {code, label, uom} format
- **Labels null** - ObsP\_\* are numeric measurements, not coded enumerations

### Integration: `buildFeature()`

**Location:** Line 576-603

**Changes:**

```typescript
const objectSiteInfo = extractObjectSite(place);
const objectPopulations = extractObjectPopulation(place); // NEW

// ... build forestand object ...

if (objectPopulations) {
  forestand.population = objectPopulations; // NEW
}
```

Simple 3-line integration.

## Storage

Population data is:

- ✅ Stored in GeoJSON properties
- ✅ Exported in JSON format
- ✅ Preserved on re-import
- ✅ Hidden from UI (Phase 1 - storage only)
- ❌ Not mapped to internal attributes yet (Phase 2)

## Future Phases

### Phase 2: Display in UI (Next Step)

- Show population data in ItemModal view mode
- Display key metrics (age, height, volume)
- Read-only initially

### Phase 3: Internal Attribute Mapping

- Map ObsP\_\* to internal attributes
- Create populationMapping.json
- Store in structured format

### Phase 4: Edit Population Data

- Allow users to add/edit/remove populations
- Form inputs for measurements
- Validation rules

## Testing

### Manual Test with Sample XML:

1. Import `exempel_ok_bestandsregister.xml`
2. Inspect imported Place properties
3. Verify `properties.forestand.population` array exists
4. Check array length matches Object_Population count
5. Verify observations extracted correctly
6. Export as JSON and inspect structure
7. Re-import and verify data preserved
